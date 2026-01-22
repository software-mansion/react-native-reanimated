#pragma once

#include <reanimated/Tools/DevToolsProtocol.h>

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <thread>
#include <unordered_map>
#include <vector>

namespace reanimated {

/**
 * DevToolsServer - Background thread for network I/O
 *
 * Handles all communication with the devtools-server frontend.
 * Receives work from app threads via lock-protected queues,
 * processes and sends data on a dedicated network thread.
 *
 * Features:
 * - Async network I/O (no blocking on app threads)
 * - Batched sending with 300ms timeout or on-demand flush
 * - Lazy string registration for profiler (pointer-based)
 */
class DevToolsServer {
 public:
  static constexpr int DEFAULT_PORT = 8765;
  static constexpr const char *DEFAULT_HOST = "127.0.0.1";
  static constexpr auto FLUSH_INTERVAL = std::chrono::milliseconds(300);

  static DevToolsServer &getInstance();

  // Start the background network thread
  void start();

  // Stop the background thread and close connection
  void stop();

  // Queue mutations for sending (takes ownership, called from any thread)
  void sendMutations(std::vector<SimpleMutation> &&mutations);

  // Queue profiler events for sending (called from any thread)
  // Events contain raw pointers that will be resolved on the network thread
  void sendProfilerEvents(std::vector<ProfilerEventInternal> &&events);

  // Request an immediate flush (called when sending mutations)
  void requestFlush();

  // Check if server is running
  bool isRunning() const {
    return running_.load(std::memory_order_acquire);
  }

 private:
  DevToolsServer() = default;
  ~DevToolsServer();

  DevToolsServer(const DevToolsServer &) = delete;
  DevToolsServer &operator=(const DevToolsServer &) = delete;

  // Network thread main loop
  void networkThreadLoop();

  // Connection management
  bool connectIfNeeded();
  void disconnect();

  // Send data to server
  void sendPendingData();
  void sendMutationsBatch(const std::vector<SimpleMutation> &mutations);
  void sendProfilerStringsBatch(const std::vector<ProfilerStringEntry> &strings);
  void sendProfilerEventsBatch(const std::vector<ProfilerEvent> &events);
  bool sendRawData(const void *data, size_t size);

  // Resolve profiler event pointers to IDs (called on network thread only)
  std::vector<ProfilerEvent> resolveProfilerEvents(const std::vector<ProfilerEventInternal> &events);
  uint32_t getOrRegisterString(const char *name);

  // Network thread
  std::thread networkThread_;
  std::atomic<bool> running_{false};

  // Work queues (protected by queueMutex_)
  std::mutex queueMutex_;
  std::condition_variable queueCondition_;
  std::vector<std::vector<SimpleMutation>> pendingMutations_;
  std::vector<std::vector<ProfilerEventInternal>> pendingProfilerEvents_;
  bool flushRequested_{false};

  // String registry (only accessed from network thread - no mutex needed)
  std::unordered_map<const char *, uint32_t> pointerToId_;
  std::vector<ProfilerStringEntry> pendingStringRegistrations_;
  uint32_t nextStringId_{1};

  // Socket
  int socket_{-1};
};

} // namespace reanimated
