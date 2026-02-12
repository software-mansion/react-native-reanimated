#include <reanimated/Tools/DevToolsProfiler.h>
#include <reanimated/Tools/DevToolsServer.h>

#include <cstring>
#include "reanimated/Tools/DevToolsProtocol.h"

#if defined(__APPLE__) || defined(ANDROID)
#include <arpa/inet.h>
#include <fcntl.h>
#include <glog/logging.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#endif

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

  devToolsStartTimeNs_ = getCurrentTimestampNs();
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

#if defined(__APPLE__) || defined(ANDROID)
  if (clientSocket_ != INVALID_SOCKET) {
    close(clientSocket_);
    clientSocket_ = INVALID_SOCKET;
  }
  if (serverSocket_ != INVALID_SOCKET) {
    close(serverSocket_);
    serverSocket_ = INVALID_SOCKET;
  }
#endif

  hasActiveClient_ = false;
  boundPort_ = 0;
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

void DevToolsServer::onClientDisconnected() {
  // Clear tracking - will resend on reconnect
  threadMetadataSent_.clear();
  stringsSent_.clear();

  // Clear buffered data to avoid duplicates
  bufferedThreadMetadata_.clear();

  // Reset string registry (strings will be re-registered as needed)
  pointerToId_.clear();
  pendingStringRegistrations_.clear();
  nextStringId_ = 1;

  // Notify profiler to resend thread metadata
  DevToolsProfiler::getInstance().onClientDisconnected();
}

void DevToolsServer::networkThreadLoop() {
  // First, try to bind to an available port
  if (!bindToAvailablePort()) {
    LOG(ERROR) << "DevTools: No port available in range " << DevToolsConfig::PORT_START << "-"
               << DevToolsConfig::PORT_END;
    running_.store(false, std::memory_order_release);
    return;
  }

  while (running_.load(std::memory_order_acquire)) {
    // Accept new connections if we don't have a client
    if (clientSocket_ == INVALID_SOCKET) {
      acceptClients();
    }

    // Handle client handshake or data sending
    if (clientSocket_ != INVALID_SOCKET && !clientReady_) {
      // Client connected but not ready yet - try to read ClientReady
      if (!handleClientHandshake()) {
        // Client disconnected or error - clean up
        close(clientSocket_);
        clientSocket_ = INVALID_SOCKET;
        hasActiveClient_ = false;
        clientReady_ = false;
        onClientDisconnected();
      }
    }

    // Flush profiler events from thread-local buffers to the queue
    // This must be done periodically to collect events from all threads
    DevToolsProfiler::getInstance().flush();

    // Process pending work
    std::vector<MutationBatch> mutationBatches;
    std::vector<std::vector<ProfilerEventInternal>> profilerBatches;
    std::vector<ThreadMetadata> threadMetadata;

    {
      std::unique_lock<std::mutex> lock(queueMutex_);

      // Wait until: work available OR timeout OR stop requested
      // Also wake up if we have a client waiting for handshake
      queueCondition_.wait_for(lock, std::chrono::milliseconds(DevToolsConfig::FLUSH_INTERVAL_MS), [this] {
        return !pendingMutations_.empty() || !pendingProfilerEvents_.empty() || !pendingThreadMetadata_.empty() ||
            flushRequested_ || !running_.load(std::memory_order_acquire) ||
            (clientSocket_ != INVALID_SOCKET && !clientReady_);
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

    // Periodic connection check: if client is ready, verify it's still connected
    if (clientReady_ && !checkClientConnection()) {
      // Client disconnected during idle period - clean up
      LOG(INFO) << "DevTools: Client disconnected (detected in idle check)";
#if defined(__APPLE__) || defined(ANDROID)
      close(clientSocket_);
#endif
      clientSocket_ = INVALID_SOCKET;
      hasActiveClient_ = false;
      clientReady_ = false;
      onClientDisconnected();
    }

    // Only send data if client has completed handshake
    if (clientSocket_ != INVALID_SOCKET && clientReady_) {

      // Send thread metadata (only for threads not yet sent to this client)
      std::vector<ThreadMetadata> newMetadata;
      for (const auto &meta : threadMetadata) {
        if (threadMetadataSent_.find(meta.threadId) == threadMetadataSent_.end()) {
          newMetadata.push_back(meta);
          threadMetadataSent_.insert(meta.threadId);
        }
      }
      if (!newMetadata.empty()) {
        sendThreadMetadataBatch(newMetadata);
      }

      // Send mutations
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
    } else {
      // No client - buffer the data

      // Buffer profiler events (accumulate into single buffer)
      for (auto &batch : profilerBatches) {
        bufferedProfilerEvents_.insert(
            bufferedProfilerEvents_.end(),
            std::make_move_iterator(batch.begin()),
            std::make_move_iterator(batch.end()));
      }

      // Buffer thread metadata (with limit)
      for (const auto &meta : threadMetadata) {
        if (bufferedThreadMetadata_.size() < DevToolsConfig::MAX_THREAD_METADATA) {
          bufferedThreadMetadata_.push_back(meta);
        }
        // If over limit, we silently drop (circular buffer would be better but
        // this is simpler)
      }

      // Buffer mutations only if first client hasn't connected yet
      if (!firstClientEverConnected_) {
        for (auto &batch : mutationBatches) {
          if (bufferedMutations_.size() < DevToolsConfig::MUTATIONS_BUFFER_MAX_COUNT) {
            bufferedMutations_.push_back(std::move(batch));
          } else {
            LOG(WARNING)
                << "DevTools: Mutations buffer overflow - new mutations will be discarded until first client connects";
            break;
          }
        }
      }
      // After first client, mutations are discarded (no point buffering without
      // initial state)
    }
  }

// Cleanup
#if defined(__APPLE__) || defined(ANDROID)
  if (clientSocket_ != INVALID_SOCKET) {
    close(clientSocket_);
    clientSocket_ = INVALID_SOCKET;
  }
  if (serverSocket_ != INVALID_SOCKET) {
    close(serverSocket_);
    serverSocket_ = INVALID_SOCKET;
  }
#endif
}

bool DevToolsServer::checkClientConnection() {
#if defined(__APPLE__) || defined(ANDROID)
  if (clientSocket_ == INVALID_SOCKET) {
    return false;
  }

  // Use recv with MSG_PEEK to check if socket is still connected
  // without removing data from the buffer
  char buf;
  ssize_t result = recv(clientSocket_, &buf, 1, MSG_PEEK);

  if (result == 0) {
    // Client disconnected gracefully
    return false;
  }

  if (result < 0) {
    // Check if it's just no data available (EAGAIN/EWOULDBLOCK)
    // or a real error (connection broken)
    if (errno == EAGAIN || errno == EWOULDBLOCK) {
      // No data available, but socket is still connected
      return true;
    }
    // Other error means disconnected
    return false;
  }

  // Data available, socket is connected
  return true;
#else
  return false;
#endif
}

bool DevToolsServer::bindToAvailablePort() {
#if defined(__APPLE__) || defined(ANDROID)
  serverSocket_ = socket(AF_INET, SOCK_STREAM, 0);
  if (serverSocket_ < 0) {
    LOG(ERROR) << "DevTools: Failed to create socket";
    return false;
  }

  int opt = 1;
  setsockopt(serverSocket_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  // Set non-blocking
  fcntl(serverSocket_, F_SETFL, O_NONBLOCK);

  struct sockaddr_in serverAddr;
  memset(&serverAddr, 0, sizeof(serverAddr));
  serverAddr.sin_family = AF_INET;
  serverAddr.sin_addr.s_addr = htonl(INADDR_LOOPBACK); // localhost only

  // Try each port in the range
  for (uint16_t port = DevToolsConfig::PORT_START; port <= DevToolsConfig::PORT_END; ++port) {
    serverAddr.sin_port = htons(port);

    if (bind(serverSocket_, reinterpret_cast<struct sockaddr *>(&serverAddr), sizeof(serverAddr)) == 0) {
      if (listen(serverSocket_, 1) == 0) {
        boundPort_ = port;
        LOG(INFO) << "DevTools: Server listening on port " << port;
        return true;
      }
    }
  }

  close(serverSocket_);
  serverSocket_ = INVALID_SOCKET;
  return false;
#else
  return false;
#endif
}

void DevToolsServer::acceptClients() {
#if defined(__APPLE__) || defined(ANDROID)
  struct sockaddr_in clientAddr;
  socklen_t clientLen = sizeof(clientAddr);

  int newSocket = accept(serverSocket_, reinterpret_cast<struct sockaddr *>(&clientAddr), &clientLen);

  if (newSocket < 0) {
    return; // No pending connection (non-blocking)
  }

  // Check if we already have an active client
  if (hasActiveClient_) {
    // Reject this connection
    sendConnectionRejected(newSocket, "App already has an active DevTools connection");
    close(newSocket);
    return;
  }

  // Accept this client
  clientSocket_ = newSocket;
  hasActiveClient_ = true;

  // Set client socket to non-blocking mode
  // This is critical - accept() returns a new socket that defaults to blocking
  fcntl(clientSocket_, F_SETFL, O_NONBLOCK);

  // Set socket timeout for sends (as a safety net)
  struct timeval timeout;
  timeout.tv_sec = 0;
  timeout.tv_usec = 100000; // 100ms timeout
  setsockopt(clientSocket_, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));

  // Ignore SIGPIPE on this socket - we handle errors via return values
  // This prevents app crash when client disconnects abruptly (e.g., after probe)
#ifdef __APPLE__
  int noSigpipe = 1;
  setsockopt(clientSocket_, SOL_SOCKET, SO_NOSIGPIPE, &noSigpipe, sizeof(noSigpipe));
#endif

  LOG(INFO) << "DevTools: Client connected, waiting for ClientReady";

  // Send device info immediately
  sendDeviceInfo();

  // Don't flush buffers yet - wait for ClientReady handshake
  // This allows probes to connect, get info, and disconnect cleanly
#endif
}

void DevToolsServer::flushBuffersToClient() {
  // Send all buffered thread metadata
  if (!bufferedThreadMetadata_.empty()) {
    sendThreadMetadataBatch(bufferedThreadMetadata_);
    for (const auto &meta : bufferedThreadMetadata_) {
      threadMetadataSent_.insert(meta.threadId);
    }
    bufferedThreadMetadata_.clear();
  }

  // Send all buffered mutations
  for (const auto &batch : bufferedMutations_) {
    sendMutationsBatch(batch.mutations, batch.timestampNs);
  }
  bufferedMutations_.clear();

  // Resolve and send all buffered profiler events
  if (!bufferedProfilerEvents_.empty()) {
    auto resolved = resolveProfilerEvents(bufferedProfilerEvents_);

    // Send string registrations first
    if (!pendingStringRegistrations_.empty()) {
      sendProfilerStringsBatch(pendingStringRegistrations_);
      pendingStringRegistrations_.clear();
    }

    // Send events
    if (!resolved.empty()) {
      sendProfilerEventsBatch(resolved);
    }
    bufferedProfilerEvents_.clear();
  }
}

bool DevToolsServer::handleClientHandshake() {
#if defined(__APPLE__) || defined(ANDROID)
  // Try to read ClientReady message (non-blocking recv on non-blocking socket)
  DevToolsMessageHeader header;
  ssize_t bytesRead = recv(clientSocket_, &header, sizeof(header), 0);

  if (bytesRead < 0) {
    if (errno == EAGAIN || errno == EWOULDBLOCK) {
      // No data yet - this is expected
      return true; // Keep waiting
    }
    // Error
    LOG(INFO) << "DevTools: Error reading handshake: " << strerror(errno);
    return false;
  }

  if (bytesRead == 0) {
    // Client disconnected
    LOG(INFO) << "DevTools: Client disconnected during handshake";
    return false;
  }

  if (bytesRead != sizeof(header)) {
    LOG(WARNING) << "DevTools: Partial header read during handshake";
    return false;
  }

  // Validate header
  if (header.magic != DevToolsMessageHeader::MAGIC || header.version != DevToolsMessageHeader::VERSION ||
      header.type != DevToolsMessageType::ClientReady) {
    LOG(WARNING) << "DevTools: Invalid handshake message (type=" << static_cast<int>(header.type) << ")";
    return false;
  }

  // Read ClientReady payload if any
  if (header.payloadCount > 0) {
    ClientReadyMessage msg;
    bytesRead = recv(clientSocket_, &msg, sizeof(msg), 0);
    if (bytesRead != sizeof(msg)) {
      LOG(WARNING) << "DevTools: Failed to read ClientReady payload";
      return false;
    }
    LOG(INFO) << "DevTools: Client protocol version: " << static_cast<int>(msg.protocolVersion);
  }

  // Handshake complete!
  LOG(INFO) << "DevTools: Client ready - flushing buffers";
  clientReady_ = true;

  // Mark first client as connected (mutations won't be buffered after this)
  firstClientEverConnected_ = true;

  // Flush buffered data to the client
  flushBuffersToClient();

  return true;
#else
  return false;
#endif
}

void DevToolsServer::sendDeviceInfo() {
  DeviceInfoMessage info;
  memset(&info, 0, sizeof(info));

#ifdef __APPLE__
  strncpy(info.deviceName, "iOS Device", sizeof(info.deviceName) - 1);
#elif defined(ANDROID)
  strncpy(info.deviceName, "Android Device", sizeof(info.deviceName) - 1);
#else
  strncpy(info.deviceName, "Unknown Device", sizeof(info.deviceName) - 1);
#endif

  info.port = boundPort_;
  info.appStartTimeNs = devToolsStartTimeNs_;
  info.bufferedProfilerEvents = static_cast<uint32_t>(bufferedProfilerEvents_.size());
  info.bufferedMutations = 0;
  for (const auto &batch : bufferedMutations_) {
    info.bufferedMutations += static_cast<uint32_t>(batch.mutations.size());
  }

  DevToolsMessageHeader header(DevToolsMessageType::DeviceInfo, 1);
  sendRawData(&header, sizeof(header));
  sendRawData(&info, sizeof(info));
}

void DevToolsServer::sendConnectionRejected(int socket, const char *reason) {
#if defined(__APPLE__) || defined(ANDROID)
  ConnectionRejectedMessage msg;
  memset(&msg, 0, sizeof(msg));
  strncpy(msg.reason, reason, sizeof(msg.reason) - 1);

  DevToolsMessageHeader header(DevToolsMessageType::ConnectionRejected, 1);

  // Send directly to the socket (not the main client socket)
  // Use MSG_NOSIGNAL on Linux to avoid SIGPIPE, SO_NOSIGPIPE already set on Apple
#ifdef __APPLE__
  send(socket, &header, sizeof(header), 0);
  send(socket, &msg, sizeof(msg), 0);
#else
  send(socket, &header, sizeof(header), MSG_NOSIGNAL);
  send(socket, &msg, sizeof(msg), MSG_NOSIGNAL);
#endif
#else
  (void)socket;
  (void)reason;
#endif
}

void DevToolsServer::sendMutationsBatch(const std::vector<SimpleMutation> &mutations, uint64_t timestamp) {
  if (mutations.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::Mutations, static_cast<uint32_t>(mutations.size()), timestamp);

  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  sendRawData(mutations.data(), mutations.size() * sizeof(SimpleMutation));
}

void DevToolsServer::sendProfilerStringsBatch(const std::vector<ProfilerStringEntry> &strings) {
  if (strings.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::ProfilerStringRegistry, static_cast<uint32_t>(strings.size()));

  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  sendRawData(strings.data(), strings.size() * sizeof(ProfilerStringEntry));
}

void DevToolsServer::sendProfilerEventsBatch(const std::vector<ProfilerEvent> &events) {
  if (events.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::ProfilerEvents, static_cast<uint32_t>(events.size()));

  static std::unordered_map<uint32_t, int> depthMap;

  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  for (auto &event : events) {
    if (!depthMap.contains(event.threadId)) {
      depthMap[event.threadId] = -1;
    }
    auto &depth = depthMap[event.threadId];
    if (event.type == Begin) {
      depth++;
    } else {
      if (depth < 0) {
        throw "dupa";
      }
      depth--;
    }
  }

  sendRawData(events.data(), events.size() * sizeof(ProfilerEvent));
}

void DevToolsServer::sendThreadMetadataBatch(const std::vector<ThreadMetadata> &metadata) {
  if (metadata.empty()) {
    return;
  }

  DevToolsMessageHeader header(DevToolsMessageType::ThreadMetadata, static_cast<uint32_t>(metadata.size()));

  if (!sendRawData(&header, sizeof(header))) {
    return;
  }

  sendRawData(metadata.data(), metadata.size() * sizeof(ThreadMetadata));
}

bool DevToolsServer::sendRawData(const void *data, size_t size) {
#if defined(__APPLE__) || defined(ANDROID)
  if (clientSocket_ == INVALID_SOCKET) {
    return false;
  }

  ssize_t sent = send(clientSocket_, data, size, 0);
  if (sent < 0 || static_cast<size_t>(sent) != size) {
    // Connection lost
    LOG(INFO) << "DevTools: Client disconnected (send failed)";
    close(clientSocket_);
    clientSocket_ = INVALID_SOCKET;
    hasActiveClient_ = false;
    onClientDisconnected();
    return false;
  }
  return true;
#else
  (void)data;
  (void)size;
  return false;
#endif
}

std::vector<ProfilerEvent> DevToolsServer::resolveProfilerEvents(const std::vector<ProfilerEventInternal> &events) {
  std::vector<ProfilerEvent> resolved;
  resolved.reserve(events.size());

  for (const auto &event : events) {
    ProfilerEvent resolvedEvent;

    if (event.type == ProfilerEventType::Begin) {
      // NOLINTBEGIN(performance-no-int-to-ptr)
      // Intentional: namePtr stores a static string literal pointer as uint64_t
      const char *name = reinterpret_cast<const char *>(event.namePtr);
      // NOLINTEND(performance-no-int-to-ptr)
      resolvedEvent.stringId = getOrRegisterString(name);
    }
    resolvedEvent.type = event.type;
    resolvedEvent.threadId = static_cast<uint32_t>(event.threadId);
    resolvedEvent.timeNs = event.timeNs - devToolsStartTimeNs_;
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
