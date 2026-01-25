#ifdef ANDROID
#include <pthread.h>
#elif defined(__APPLE__)
#include <dispatch/dispatch.h>
#endif
#include <reanimated/Tools/DevToolsProfiler.h>
#include <reanimated/Tools/DevToolsServer.h>

namespace reanimated {

// ProfilerThreadBuffer implementation

ProfilerThreadInfo::ProfilerThreadInfo(size_t initialSize) {
  bufferA_.reserve(initialSize);
  bufferB_.reserve(initialSize);
}

void ProfilerThreadInfo::addEvent(ProfilerEventInternal &event) {
  // No lock needed - only this thread writes to active buffer
  auto &active = activeIsA_.load(std::memory_order_acquire) ? bufferA_ : bufferB_;
  event.threadId = std::hash<std::thread::id>{}(threadId_);
  active.push_back(event);
}

std::vector<ProfilerEventInternal> ProfilerThreadInfo::swapAndCollect() {
  std::lock_guard<std::mutex> lock(swapMutex_);

  bool wasA = activeIsA_.load(std::memory_order_acquire);
  auto &ready = wasA ? bufferA_ : bufferB_;

  if (ready.empty()) {
    return {};
  }

  // Swap active buffer
  activeIsA_.store(!wasA, std::memory_order_release);

  // Move and clear the ready buffer
  auto result = std::move(ready);
  ready.clear();
  // Keep capacity for next round
  ready.reserve(PROFILER_BUFFER_INITIAL_SIZE);

  return result;
}

bool ProfilerThreadInfo::hasEvents() const {
  bool isA = activeIsA_.load(std::memory_order_acquire);
  const auto &active = isA ? bufferA_ : bufferB_;
  return !active.empty();
}

void ProfilerThreadInfo::updateThreadInfo() {
  threadId_ = std::this_thread::get_id();
#ifdef ANDROID

#if __ANDROID_API__ >= 26
  char threadName[64];
  pthread_getname_np(pthread_self(), threadName, sizeof(threadName));
  threadName_ = threadName;
#else
  // Fallback for older Android versions
  threadName_ = "Thread " + std::to_string(std::hash<std::thread::id>{}(threadId_));
#endif
#elif defined(__APPLE__)
  const char *threadName = dispatch_queue_get_label(DISPATCH_CURRENT_QUEUE_LABEL);
  if (!strcmp(threadName, dispatch_queue_get_label(dispatch_get_main_queue()))) {
    threadName_ = threadName;
  } else {
    char threadName[64];
    pthread_getname_np(pthread_self(), threadName, sizeof(threadName));
    threadName_ = threadName;
  }
#endif
}

std::string ProfilerThreadInfo::getThreadName() const {
  return threadName_;
}

std::thread::id ProfilerThreadInfo::getThreadId() const {
  return threadId_;
}

bool ProfilerThreadInfo::hasMetadataBeenSent() const {
  return metadataSent_.load(std::memory_order_acquire);
}

void ProfilerThreadInfo::markMetadataAsSent() {
  metadataSent_.store(true, std::memory_order_release);
}

// DevToolsProfiler implementation

DevToolsProfiler &DevToolsProfiler::getInstance() {
  static DevToolsProfiler instance;
  return instance;
}

ProfilerThreadInfo &DevToolsProfiler::getThreadBuffer() {
  thread_local ProfilerThreadInfo *threadInfo = nullptr;

  if (threadInfo == nullptr) {
    // Try to grab a preallocated buffer
    size_t idx = preallocatedIndex_.fetch_add(1, std::memory_order_relaxed);
    if (idx < PROFILER_PREALLOCATED_BUFFERS) {
      threadInfo = buffers_[idx].get();
      threadInfo->updateThreadInfo();
      // Register for flushing
      std::lock_guard<std::mutex> lock(threadBuffersMutex_);
      threadBuffers_.push_back(threadInfo);
    } else {
      // Create new buffer and store in dynamicBuffers_ to manage lifetime
      auto newBuffer = std::make_unique<ProfilerThreadInfo>();
      newBuffer->updateThreadInfo();
      threadInfo = newBuffer.get();
      // Register for flushing and store ownership
      std::lock_guard<std::mutex> lock(threadBuffersMutex_);
      buffers_.push_back(std::move(newBuffer));
      threadBuffers_.push_back(threadInfo);
    }
  }

  return *threadInfo;
}

void DevToolsProfiler::flush() {
  std::vector<ProfilerThreadInfo *> buffers;
  {
    std::lock_guard<std::mutex> lock(threadBuffersMutex_);
    buffers = threadBuffers_;
  }

  // Send thread metadata for any threads that haven't been announced yet
  for (auto *buffer : buffers) {
    if (!buffer->hasMetadataBeenSent()) {
      uint32_t threadId = std::hash<std::thread::id>{}(buffer->getThreadId());
      DevToolsServer::getInstance().sendThreadMetadata(threadId, buffer->getThreadName());
      buffer->markMetadataAsSent();
    }
  }

  // Collect events from all thread buffers
  std::vector<ProfilerEventInternal> allEvents;
  for (auto *buffer : buffers) {
    auto events = buffer->swapAndCollect();
    if (!events.empty()) {
      allEvents.insert(allEvents.end(), events.begin(), events.end());
    }
  }

  // Send to server
  if (!allEvents.empty()) {
    DevToolsServer::getInstance().sendProfilerEvents(std::move(allEvents));
  }
}

} // namespace reanimated
