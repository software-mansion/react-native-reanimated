#include <reanimated/Tools/DevToolsProfiler.h>
#include <reanimated/Tools/DevToolsServer.h>

namespace reanimated {

// ProfilerThreadBuffer implementation

ProfilerThreadBuffer::ProfilerThreadBuffer(size_t initialSize) {
  bufferA_.reserve(initialSize);
  bufferB_.reserve(initialSize);
}

void ProfilerThreadBuffer::addEvent(const ProfilerEventInternal &event) {
  // No lock needed - only this thread writes to active buffer
  auto &active = activeIsA_.load(std::memory_order_acquire) ? bufferA_ : bufferB_;
  active.push_back(event);
}

std::vector<ProfilerEventInternal> ProfilerThreadBuffer::swapAndCollect() {
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

bool ProfilerThreadBuffer::hasEvents() const {
  bool isA = activeIsA_.load(std::memory_order_acquire);
  const auto &active = isA ? bufferA_ : bufferB_;
  return !active.empty();
}

// DevToolsProfiler implementation

DevToolsProfiler &DevToolsProfiler::getInstance() {
  static DevToolsProfiler instance;
  return instance;
}

ProfilerThreadBuffer &DevToolsProfiler::getThreadBuffer() {
  thread_local ProfilerThreadBuffer *buffer = nullptr;

  if (buffer == nullptr) {
    // Try to grab a preallocated buffer
    size_t idx = preallocatedIndex_.fetch_add(1, std::memory_order_relaxed);
    if (idx < preallocatedBuffers_.size()) {
      buffer = preallocatedBuffers_[idx].get();
      // Register for flushing
      std::lock_guard<std::mutex> lock(threadBuffersMutex_);
      threadBuffers_.push_back(buffer);
    } else {
      // Create new buffer and store in dynamicBuffers_ to manage lifetime
      auto newBuffer = std::make_unique<ProfilerThreadBuffer>();
      buffer = newBuffer.get();
      // Register for flushing and store ownership
      std::lock_guard<std::mutex> lock(threadBuffersMutex_);
      dynamicBuffers_.push_back(std::move(newBuffer));
      threadBuffers_.push_back(buffer);
    }
  }

  return *buffer;
}

void DevToolsProfiler::preallocateBuffers(size_t count) {
  preallocatedBuffers_.reserve(count);
  for (size_t i = 0; i < count; ++i) {
    preallocatedBuffers_.push_back(std::make_unique<ProfilerThreadBuffer>());
  }
}

void DevToolsProfiler::flush() {
  std::vector<ProfilerThreadBuffer *> buffers;
  {
    std::lock_guard<std::mutex> lock(threadBuffersMutex_);
    buffers = threadBuffers_;
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
