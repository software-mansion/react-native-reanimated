#pragma once

#include <reanimated/Tools/DevToolsProtocol.h>

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

/**
 * DevToolsServer - TCP Server for DevTools connections
 *
 * Runs a server on the app side that DevTools connects to.
 * This allows connecting to already-running apps and supports
 * multiple apps running simultaneously (different ports).
 *
 * Features:
 * - Binds to first available port in range 8765-8784
 * - Buffers data when no client connected
 * - Flushes buffers on client connect
 * - Supports one client at a time (rejects additional connections)
 */
class DevToolsServer {
 public:
  static DevToolsServer &getInstance();

  // Start the server (binds to port, starts network thread)
  void start();

  // Stop the server and close all connections
  void stop();

  // Queue mutations for sending (takes ownership, called from any thread)
  void sendMutations(std::vector<SimpleMutation> &&mutations);

  // Queue profiler events for sending (called from any thread)
  // Events contain raw pointers that will be resolved on the network thread
  void sendProfilerEvents(std::vector<ProfilerEventInternal> &&events);

  // Send thread metadata (called once per thread, from any thread)
  void sendThreadMetadata(uint32_t threadId, const std::string &threadName);

  // Request an immediate flush (called when sending mutations)
  void requestFlush();

  // Check if server is running (thread-safe)
  bool isRunning() const {
    return running_.load(std::memory_order_acquire);
  }

  // Called by profiler when client disconnects - resets tracking state
  void onClientDisconnected();

 private:
  DevToolsServer() = default;
  ~DevToolsServer();

  DevToolsServer(const DevToolsServer &) = delete;
  DevToolsServer &operator=(const DevToolsServer &) = delete;

  // Network thread main loop
  void networkThreadLoop();

  // Server socket management
  bool bindToAvailablePort();
  void acceptClients();
  void handleClient();

  // Send buffered data to newly connected client
  void flushBuffersToClient();

  // Handle client handshake - waits for ClientReady message
  // Returns true if handshake completed successfully, false if disconnected/error
  bool handleClientHandshake();

  // Send data to client
  void sendPendingData();
  void sendDeviceInfo();
  void sendConnectionRejected(int socket, const char *reason);
  void sendMutationsBatch(const std::vector<SimpleMutation> &mutations, uint64_t timestamp);
  void sendProfilerStringsBatch(const std::vector<ProfilerStringEntry> &strings);
  void sendProfilerEventsBatch(const std::vector<ProfilerEvent> &events);
  void sendThreadMetadataBatch(const std::vector<ThreadMetadata> &metadata);
  bool sendRawData(const void *data, size_t size);

  // Resolve profiler event pointers to IDs (called on network thread only)
  std::vector<ProfilerEvent> resolveProfilerEvents(const std::vector<ProfilerEventInternal> &events);
  uint32_t getOrRegisterString(const char *name);

  // Helper to get current timestamp
  static uint64_t getCurrentTimestampNs();

  // Check if client is still connected (non-blocking)
  // Returns false if client disconnected
  bool checkClientConnection();

  // Mutation batch with timestamp
  struct MutationBatch {
    std::vector<SimpleMutation> mutations;
    uint64_t timestampNs;
  };

  // Network thread
  std::thread networkThread_;
  std::atomic<bool> running_{false};

  // Server state (all accessed only from network thread except noted)
  uint16_t boundPort_{0}; // Network thread only
  bool hasActiveClient_{false}; // Network thread only
  bool clientReady_{false}; // Network thread only - true after ClientReady received
  bool firstClientEverConnected_{false}; // Network thread only
  int serverSocket_{-1}; // Network thread only
  int clientSocket_{-1}; // Network thread only

  uint64_t devToolsStartTimeNs_{0};

  // Work queues (protected by queueMutex_)
  std::mutex queueMutex_;
  std::condition_variable queueCondition_;
  std::vector<MutationBatch> pendingMutations_;
  std::vector<std::vector<ProfilerEventInternal>> pendingProfilerEvents_;
  std::vector<ThreadMetadata> pendingThreadMetadata_;
  bool flushRequested_{false};

  // Buffered data (for when no client is connected)
  std::vector<MutationBatch> bufferedMutations_;
  std::vector<ProfilerEventInternal> bufferedProfilerEvents_;
  std::vector<ThreadMetadata> bufferedThreadMetadata_;

  // Tracking what has been sent to current client
  std::unordered_set<uint32_t> threadMetadataSent_;
  std::unordered_set<const char *> stringsSent_;

  // String registry (only accessed from network thread - no mutex needed)
  std::unordered_map<const char *, uint32_t> pointerToId_;
  std::vector<ProfilerStringEntry> pendingStringRegistrations_;
  uint32_t nextStringId_{1};

  // Sockets
  static constexpr int INVALID_SOCKET = -1;
};

} // namespace reanimated
