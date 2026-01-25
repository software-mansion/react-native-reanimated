#include <reanimated/Tools/DevToolsServer.h>

#ifdef __APPLE__
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#elif defined(ANDROID)
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#endif

#include <cstring>

namespace reanimated {

DevToolsServer &DevToolsServer::getInstance() {
  static DevToolsServer instance;
  return instance;
}

DevToolsServer::~DevToolsServer() {
  stop();
}

void DevToolsServer::start() {
  bool expected = false;
  if (!running_.compare_exchange_strong(expected, true)) {
    return; // Already running
  }

  networkThread_ = std::thread([this]() { networkThreadLoop(); });
}

void DevToolsServer::stop() {
  {
    std::lock_guard<std::mutex> lock(queueMutex_);
    running_.store(false, std::memory_order_release);
    queueCondition_.notify_one();
  }

  if (networkThread_.joinable()) {
    networkThread_.join();
  }

  disconnect();
}

void DevToolsServer::sendMutations(std::vector<SimpleMutation> &&mutations) {
  if (!running_.load(std::memory_order_acquire)) {
    return;
  }

  MutationBatch batch;
  batch.mutations = std::move(mutations);
  batch.timestampNs = getCurrentTimestampNs();

  std::lock_guard<std::mutex> lock(queueMutex_);
  pendingMutations_.push_back(std::move(batch));
  flushRequested_ = true;
  queueCondition_.notify_one();
}

void DevToolsServer::sendProfilerEvents(std::vector<ProfilerEventInternal> &&events) {
  if (!running_.load(std::memory_order_acquire)) {
    return;
  }

  std::lock_guard<std::mutex> lock(queueMutex_);
  pendingProfilerEvents_.push_back(std::move(events));
  queueCondition_.notify_one();
}

void DevToolsServer::sendThreadMetadata(uint32_t threadId, const std::string &threadName) {
  if (!running_.load(std::memory_order_acquire)) {
    return;
  }

  ThreadMetadata metadata;
  metadata.threadId = threadId;
  strncpy(metadata.threadName, threadName.c_str(), sizeof(metadata.threadName) - 1);
  metadata.threadName[sizeof(metadata.threadName) - 1] = '\0';

  std::lock_guard<std::mutex> lock(queueMutex_);
  pendingThreadMetadata_.push_back(metadata);
  queueCondition_.notify_one();
}

void DevToolsServer::requestFlush() {
  std::lock_guard<std::mutex> lock(queueMutex_);
  flushRequested_ = true;
  queueCondition_.notify_one();
}

void DevToolsServer::networkThreadLoop() {
  while (running_.load(std::memory_order_acquire)) {
    std::vector<MutationBatch> mutationBatches;
    std::vector<std::vector<ProfilerEventInternal>> profilerBatches;
    std::vector<ThreadMetadata> threadMetadata;

    {
      std::unique_lock<std::mutex> lock(queueMutex_);

      // Wait until: work available OR timeout OR stop requested
      queueCondition_.wait_for(lock, FLUSH_INTERVAL, [this] {
        return !pendingMutations_.empty() || !pendingProfilerEvents_.empty() || !pendingThreadMetadata_.empty() ||
            flushRequested_ || !running_.load(std::memory_order_acquire);
      });

      if (!running_.load(std::memory_order_acquire)) {
        break;
      }

      // Grab all pending work
      mutationBatches = std::move(pendingMutations_);
      profilerBatches = std::move(pendingProfilerEvents_);
      threadMetadata = std::move(pendingThreadMetadata_);
      pendingMutations_.clear();
      pendingProfilerEvents_.clear();
      pendingThreadMetadata_.clear();
      flushRequested_ = false;
    }

    // Send data (outside lock)
    if (!mutationBatches.empty() || !profilerBatches.empty() || !threadMetadata.empty()) {
      if (connectIfNeeded()) {
        // Send thread metadata first (for visualization labels)
        if (!threadMetadata.empty()) {
          sendThreadMetadataBatch(threadMetadata);
        }

        // Send mutations with timestamps
        for (const auto &batch : mutationBatches) {
          sendMutationsBatch(batch.mutations, batch.timestampNs);
        }

        // Resolve and send profiler events
        for (const auto &batch : profilerBatches) {
          auto resolved = resolveProfilerEvents(batch);

          // Send any new string registrations first
          if (!pendingStringRegistrations_.empty()) {
            sendProfilerStringsBatch(pendingStringRegistrations_);
            pendingStringRegistrations_.clear();
          }

          // Then send the events
          if (!resolved.empty()) {
            sendProfilerEventsBatch(resolved);
          }
        }
      }
    }
  }
}

bool DevToolsServer::connectIfNeeded() {
#if defined(__APPLE__) || defined(ANDROID)
  if (socket_ >= 0) {
    return true; // Already connected
  }

  socket_ = socket(AF_INET, SOCK_STREAM, 0);
  if (socket_ < 0) {
    return false;
  }

  // Set socket timeout
  struct timeval timeout;
  timeout.tv_sec = 0;
  timeout.tv_usec = 100000; // 100ms timeout
  setsockopt(socket_, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));

  struct sockaddr_in serverAddr;
  memset(&serverAddr, 0, sizeof(serverAddr));
  serverAddr.sin_family = AF_INET;
  serverAddr.sin_port = htons(DEFAULT_PORT);
  inet_pton(AF_INET, DEFAULT_HOST, &serverAddr.sin_addr);

  if (::connect(socket_, reinterpret_cast<struct sockaddr *>(&serverAddr), sizeof(serverAddr)) < 0) {
    close(socket_);
    socket_ = -1;
    return false;
  }

  return true;
#else
  return false;
#endif
}

void DevToolsServer::disconnect() {
#if defined(__APPLE__) || defined(ANDROID)
  if (socket_ >= 0) {
    close(socket_);
    socket_ = -1;
  }
#endif
}

bool DevToolsServer::sendRawData(const void *data, size_t size) {
#if defined(__APPLE__) || defined(ANDROID)
  if (socket_ < 0) {
    return false;
  }

  ssize_t sent = send(socket_, data, size, 0);
  if (sent < 0 || static_cast<size_t>(sent) != size) {
    // Connection lost, close socket to trigger reconnect
    disconnect();
    return false;
  }
  return true;
#else
  (void)data;
  (void)size;
  return false;
#endif
}

void DevToolsServer::sendMutationsBatch(const std::vector<SimpleMutation> &mutations, uint64_t timestamp) {
  if (mutations.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::Mutations, static_cast<uint32_t>(mutations.size()), timestamp);

  // Send header
  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  // Send payload
  sendRawData(mutations.data(), mutations.size() * sizeof(SimpleMutation));
}

void DevToolsServer::sendProfilerStringsBatch(const std::vector<ProfilerStringEntry> &strings) {
  if (strings.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::ProfilerStringRegistry, static_cast<uint32_t>(strings.size()));

  // Send header
  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  // Send payload
  sendRawData(strings.data(), strings.size() * sizeof(ProfilerStringEntry));
}

void DevToolsServer::sendProfilerEventsBatch(const std::vector<ProfilerEvent> &events) {
  if (events.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::ProfilerEvents, static_cast<uint32_t>(events.size()));

  // Send header
  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  // Send payload
  sendRawData(events.data(), events.size() * sizeof(ProfilerEvent));
}

void DevToolsServer::sendThreadMetadataBatch(const std::vector<ThreadMetadata> &metadata) {
  if (metadata.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::ThreadMetadata, static_cast<uint32_t>(metadata.size()));

  // Send header
  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  // Send payload
  sendRawData(metadata.data(), metadata.size() * sizeof(ThreadMetadata));
}

std::vector<ProfilerEvent> DevToolsServer::resolveProfilerEvents(const std::vector<ProfilerEventInternal> &events) {
  std::vector<ProfilerEvent> resolved;
  resolved.reserve(events.size());

  for (const auto &event : events) {
    // NOLINTBEGIN(performance-no-int-to-ptr)
    // Intentional: namePtr stores a static string literal pointer as uint64_t
    const char *name = reinterpret_cast<const char *>(event.namePtr);
    // NOLINTEND(performance-no-int-to-ptr)
    uint32_t stringId = getOrRegisterString(name);

    ProfilerEvent resolvedEvent;
    resolvedEvent.stringId = stringId;
    resolvedEvent.threadId = static_cast<uint32_t>(event.threadId);
    resolvedEvent.startTimeNs = event.startTimeNs;
    resolvedEvent.endTimeNs = event.endTimeNs;
    resolved.push_back(resolvedEvent);
  }

  return resolved;
}

uint32_t DevToolsServer::getOrRegisterString(const char *name) {
  // Only called from network thread - no mutex needed
  auto it = pointerToId_.find(name);
  if (it != pointerToId_.end()) {
    return it->second;
  }

  // Register new string
  uint32_t id = nextStringId_++;
  pointerToId_[name] = id;

  // Queue for sending
  ProfilerStringEntry entry;
  entry.stringId = id;
  strncpy(entry.name, name, sizeof(entry.name) - 1);
  entry.name[sizeof(entry.name) - 1] = '\0';
  pendingStringRegistrations_.push_back(entry);

  return id;
}

uint64_t DevToolsServer::getCurrentTimestampNs() {
  auto now = std::chrono::steady_clock::now();
  auto duration = now.time_since_epoch();
  return std::chrono::duration_cast<std::chrono::nanoseconds>(duration).count();
}

} // namespace reanimated
