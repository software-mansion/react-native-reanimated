#pragma once

#include <reanimated/Tools/DevToolsProtocol.h>

#include <atomic>
#include <chrono>
#include <memory>
#include <mutex>
#include <thread>
#include <vector>

namespace reanimated {

// Forward declaration
class DevToolsServer;

// Configurable buffer size
constexpr size_t PROFILER_BUFFER_INITIAL_SIZE = 1024;
constexpr size_t PROFILER_PREALLOCATED_BUFFERS = 3;

/**
 * ProfilerThreadBuffer - Per-thread double buffer for profiler events
 *
 * Uses two buffers: one for writing (active) and one for reading (ready).
 * The swap operation is lock-free for the common case (just an atomic flag).
 * Only the swap itself needs a mutex to prevent concurrent swaps.
 */
class ProfilerThreadInfo {
 public:
  explicit ProfilerThreadInfo(size_t initialSize = PROFILER_BUFFER_INITIAL_SIZE);

  // Add event to active buffer (lock-free, called from app thread)
  void addEvent(ProfilerEventInternal &event);

  // Swap buffers and return the ready one (called from flush)
  // Returns empty vector if nothing to collect
  std::vector<ProfilerEventInternal> swapAndCollect();

  // Check if active buffer has data
  bool hasEvents() const;

  // Update thread local data
  void updateThreadInfo();

  // Get thread name (can be called from any thread)
  std::string getThreadName() const;

  // Get thread ID
  std::thread::id getThreadId() const;

  // Check if thread metadata has been sent (for synchronization with frontend)
  bool hasMetadataBeenSent() const;

  // Mark metadata as sent
  void markMetadataAsSent();

 private:
  std::vector<ProfilerEventInternal> bufferA_;
  std::vector<ProfilerEventInternal> bufferB_;
  std::atomic<bool> activeIsA_{true};
  std::mutex swapMutex_; // Only held during swap
  std::thread::id threadId_{std::this_thread::get_id()};
  std::string threadName_;
  std::atomic<bool> metadataSent_{false};
};

/**
 * DevToolsProfiler - Global profiler manager
 *
 * Manages thread-local buffers and coordinates flushing to DevToolsServer.
 * Pre-allocates buffers for important threads to avoid allocation overhead.
 */
class DevToolsProfiler {
 public:
  static DevToolsProfiler &getInstance();

  // Get thread-local buffer (creates if needed)
  ProfilerThreadInfo &getThreadBuffer();

  // Flush all thread buffers to DevToolsServer
  void flush();

 private:
  DevToolsProfiler() {
    // Pre-allocate buffers for important threads
    for (size_t i = 0; i < PROFILER_PREALLOCATED_BUFFERS; ++i) {
      buffers_.emplace_back(std::make_unique<ProfilerThreadInfo>());
    }
  }

  DevToolsProfiler(const DevToolsProfiler &) = delete;
  DevToolsProfiler &operator=(const DevToolsProfiler &) = delete;

  // Track all thread buffers for flushing
  std::mutex threadBuffersMutex_;
  std::vector<ProfilerThreadInfo *> threadBuffers_;

  std::atomic<size_t> preallocatedIndex_{0};
  // Dynamically allocated buffers for threads beyond preallocated count
  std::vector<std::unique_ptr<ProfilerThreadInfo>> buffers_;
};

/**
 * ProfilerSection - RAII profiler section marker
 *
 * Records start time on construction, end time + event on destruction.
 * Designed for minimal overhead:
 * - Constructor: just store pointer + steady_clock::now()
 * - Destructor: steady_clock::now() + buffer push (no locks, no string lookup)
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
