#include <reanimated/Tools/DevToolsProfiler.h>
#include <reanimated/Tools/DevToolsServer.h>

#include <functional>

#ifdef ANDROID
#include <pthread.h>
#if __ANDROID_API__ >= 26
#define HAS_PTHREAD_GETNAME 1
#endif
#elif defined(__APPLE__)
#include <dispatch/dispatch.h>
#include <pthread.h>
#define HAS_PTHREAD_GETNAME 1
#endif

namespace reanimated {

// ProfilerThreadInfo implementation

ProfilerThreadInfo::ProfilerThreadInfo() {
  updateThreadInfo();
}

void ProfilerThreadInfo::addEvent(const ProfilerEventInternal &event) {
  static thread_local uint32_t expectedThreadId = 0;
  if (expectedThreadId == 0) {
    expectedThreadId = threadIdHash_;
  } else if (expectedThreadId != threadIdHash_) {
    LOG(ERROR) << "SPSC violation! Expected thread " << expectedThreadId << " but called from " << threadIdHash_;
  }
  ProfilerEventInternal eventWithThread = event;
  eventWithThread.threadId = threadIdHash_;
  events_.push(eventWithThread);
}

void ProfilerThreadInfo::updateThreadInfo() {
  threadIdHash_ = static_cast<uint32_t>(std::hash<std::thread::id>{}(std::this_thread::get_id()));

#if defined(__APPLE__)
  // On Apple, use dispatch queue label only for main queue
  // For other threads, use pthread name which is more descriptive
  if (pthread_main_np() != 0) {
    // We're on the main thread, use dispatch queue label
    const char *queueLabel = dispatch_queue_get_label(DISPATCH_CURRENT_QUEUE_LABEL);
    if (queueLabel && queueLabel[0] != '\0') {
      threadName_ = queueLabel;
    } else {
      threadName_ = "Main Thread";
    }
  } else {
    // We're on a background thread, use pthread name
    char buffer[64];
    if (pthread_getname_np(pthread_self(), buffer, sizeof(buffer)) == 0 && buffer[0] != '\0') {
      threadName_ = buffer;
    } else {
      threadName_ = "Thread " + std::to_string(threadIdHash_);
    }
  }
#elif defined(ANDROID) && defined(HAS_PTHREAD_GETNAME)
  char buffer[64];
  if (pthread_getname_np(pthread_self(), buffer, sizeof(buffer)) == 0 && buffer[0] != '\0') {
    threadName_ = buffer;
  } else {
    threadName_ = "Thread " + std::to_string(threadIdHash_);
  }
#else
  threadName_ = "Thread " + std::to_string(threadIdHash_);
#endif
}

std::string ProfilerThreadInfo::getThreadName() const {
  return threadName_;
}

// DevToolsProfiler implementation

DevToolsProfiler &DevToolsProfiler::getInstance() {
  static DevToolsProfiler instance;
  return instance;
}

ProfilerThreadInfo &DevToolsProfiler::getThreadBuffer() {
  thread_local ProfilerThreadInfo *threadInfo = nullptr;

  if (threadInfo == nullptr) {
    auto newBuffer = std::make_unique<ProfilerThreadInfo>();
    threadInfo = newBuffer.get();

    // Register for flushing
    std::lock_guard<std::mutex> lock(threadBuffersMutex_);
    threadBuffers_.push_back(std::move(newBuffer));
  }

  return *threadInfo;
}

void DevToolsProfiler::flush() {
  // Get list of buffers (under lock)
  std::vector<ProfilerThreadInfo *> buffers;
  {
    std::lock_guard<std::mutex> lock(threadBuffersMutex_);
    buffers.reserve(threadBuffers_.size());
    for (const auto &buffer : threadBuffers_) {
      buffers.push_back(buffer.get());
    }
  }

  // Collect events from all thread buffers
  std::vector<ProfilerEventInternal> allEvents;

  for (auto *buffer : buffers) {
    size_t count = buffer->drainEvents(allEvents);

    // Send thread metadata if new and has events
    if (count > 0 && !buffer->hasMetadataBeenSent()) {
      DevToolsServer::getInstance().sendThreadMetadata(buffer->getThreadIdHash(), buffer->getThreadName());
      buffer->markMetadataAsSent();
    }
  }

  // Send to server
  if (!allEvents.empty()) {
    static std::unordered_map<uint64_t, int> depthMap;

    for (auto &event : allEvents) {
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
    DevToolsServer::getInstance().sendProfilerEvents(std::move(allEvents));
  }
}

void DevToolsProfiler::onClientDisconnected() {
  std::lock_guard<std::mutex> lock(threadBuffersMutex_);
  for (auto &buffer : threadBuffers_) {
    buffer->clearMetadataSent();
    // Immediately resend metadata so it's buffered for next client
    DevToolsServer::getInstance().sendThreadMetadata(buffer->getThreadIdHash(), buffer->getThreadName());
    buffer->markMetadataAsSent();
  }
}

} // namespace reanimated
