#pragma once

#include <reanimated/Tools/DevToolsProtocol.h>
#include <reanimated/Tools/SPSCRingBuffer.h>

#include <atomic>
#include <chrono>
#include <memory>
#include <mutex>
#include <thread>
#include <vector>

namespace reanimated {

// Forward declaration
class DevToolsServer;

/**
 * ProfilerThreadBuffer - Per-thread SPSC ring buffer for profiler events
 *
 * Each thread has its own buffer that is:
 * - Written to by the profiler thread (producer) - wait-free
 * - Read from by the network thread (consumer) - wait-free
 *

 */
class ProfilerThreadInfo {
 public:
  explicit ProfilerThreadInfo();

  // Add event to ring buffer (lock-free, called from profiler thread)
  // Returns false if buffer is full (event dropped)
  bool addEvent(const ProfilerEventInternal &event);

  // Drain all available events (called from network thread)
  // Returns number of events drained, sets wasOverflowed if overflow occurred
  template <typename OutputIt>
  size_t drainEvents(OutputIt out, bool &wasOverflowed) {
    return events_.drainBounded(out, wasOverflowed);
  }

  // Check if buffer has events
  bool hasEvents() const {
    return !events_.empty();
  }

  // Update thread local data (name, id)
  void updateThreadInfo();

  // Get thread name (can be called from any thread)
  std::string getThreadName() const;

  // Get thread ID hash
  uint32_t getThreadIdHash() const {
    return threadIdHash_;
  }

  // Check if thread metadata has been sent to current client
  bool hasMetadataBeenSent() const {
    return metadataSent_.load(std::memory_order_acquire);
  }

  // Mark metadata as sent
  void markMetadataAsSent() {
    metadataSent_.store(true, std::memory_order_release);
  }

  // Clear metadata sent flag (called on client disconnect)
  void clearMetadataSent() {
    metadataSent_.store(false, std::memory_order_release);
  }

 private:
  SPSCRingBuffer<ProfilerEventInternal, DevToolsConfig::PROFILER_BUFFER_SIZE> events_;
  uint32_t threadIdHash_{0};
  std::string threadName_;
  std::atomic<bool> metadataSent_{false};
};

/**
 * DevToolsProfiler - Global profiler manager
 *
 * Manages thread-local SPSC buffers and coordinates flushing to DevToolsServer.
 *
 * NOTE: Thread buffers are never cleaned up when threads die.
 * This is acceptable for React Native where threads are long-lived.
 */
class DevToolsProfiler {
 public:
  static DevToolsProfiler &getInstance();

  // Get thread-local buffer (creates if needed)
  ProfilerThreadInfo &getThreadBuffer();

  // Flush all thread buffers to DevToolsServer
  void flush();

  // Called when client disconnects - resets metadata sent flags
  void onClientDisconnected();

 private:
  DevToolsProfiler() = default;

  DevToolsProfiler(const DevToolsProfiler &) = delete;
  DevToolsProfiler &operator=(const DevToolsProfiler &) = delete;

  // Track all thread buffers for flushing
  std::mutex threadBuffersMutex_;
  std::vector<std::unique_ptr<ProfilerThreadInfo>> threadBuffers_;
};

/**
 * ProfilerSection - RAII profiler section marker
 *
 * Records start time on construction, end time + event on destruction.
 * Designed for minimal overhead:
 * - Constructor: just store pointer + steady_clock::now()
 * - Destructor: steady_clock::now() + buffer push (no locks, wait-free)
 *
 * String-to-ID resolution happens on the background thread.
 */
class ProfilerSection {
 public:
  explicit ProfilerSection(const char *name)
      : name_(name), startTimeNs_(std::chrono::steady_clock::now().time_since_epoch().count()) {}

  ~ProfilerSection() {
    ProfilerEventInternal event;
    // NOLINTBEGIN(cppcoreguidelines-pro-type-reinterpret-cast)
    event.namePtr = reinterpret_cast<uint64_t>(name_);
    // NOLINTEND(cppcoreguidelines-pro-type-reinterpret-cast)
    event.threadId = 0; // Will be set by addEvent
    event.startTimeNs = startTimeNs_;
    event.endTimeNs = std::chrono::steady_clock::now().time_since_epoch().count();
    DevToolsProfiler::getInstance().getThreadBuffer().addEvent(event);
  }

  // Non-copyable, non-movable
  ProfilerSection(const ProfilerSection &) = delete;
  ProfilerSection &operator=(const ProfilerSection &) = delete;
  ProfilerSection(ProfilerSection &&) = delete;
  ProfilerSection &operator=(ProfilerSection &&) = delete;

 private:
  const char *name_;
  uint64_t startTimeNs_;
};

// Convenience macro - creates a static string literal and ProfilerSection
// NOLINTNEXTLINE(cppcoreguidelines-macro-usage)
#define REANIMATED_PROFILE_SECTION(name) \
  static constexpr const char *_reanimatedProfilerString##__LINE__ = name; \
  ::reanimated::ProfilerSection _reanimatedProfileSection##__LINE__(_reanimatedProfilerString##__LINE__)

} // namespace reanimated
