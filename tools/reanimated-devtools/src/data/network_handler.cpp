#include "data/network_handler.h"

#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <unistd.h>

#include <chrono>
#include <cstring>
#include <iostream>
#include <set>
#include <thread>
#include <vector>

#include "data/mutation_processor.h"
#include "data/profiler_processor.h"
#include "protocol.h"

namespace data {

namespace {

// Port range to scan (matches app-side DevToolsConfig)
constexpr uint16_t PORT_START = 8765;
constexpr uint16_t PORT_END = 8784;

// Timeout for port scanning (ms) - tiered by port number
constexpr int SCAN_TIMEOUT_EARLY_MS = 200; // Ports 8765-8766
constexpr int SCAN_TIMEOUT_MID_MS = 100; // Ports 8767-8774
constexpr int SCAN_TIMEOUT_LATE_MS = 50; // Ports 8775-8784

int getTimeoutForPort(uint16_t port) {
  if (port <= 8766)
    return SCAN_TIMEOUT_EARLY_MS;
  if (port <= 8774)
    return SCAN_TIMEOUT_MID_MS;
  return SCAN_TIMEOUT_LATE_MS;
}

// Try to connect to a port and get DeviceInfo
// Returns true if successful and populates device info
// If handshake fails, device is still populated with errorMessage set
bool probePort(uint16_t port, app::DiscoveredDevice &device, int timeoutMs) {
  device.port = port;
  device.valid = false;
  device.errorMessage.clear();

  int sock = socket(AF_INET, SOCK_STREAM, 0);
  if (sock < 0)
    return false;

  // Set non-blocking for connect
  fcntl(sock, F_SETFL, O_NONBLOCK);

  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(port);
  addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

  // Start non-blocking connect
  int result = connect(sock, reinterpret_cast<struct sockaddr *>(&addr), sizeof(addr));
  if (result < 0 && errno != EINPROGRESS) {
    close(sock);
    return false;
  }

  // Wait for connection with timeout
  fd_set writefds;
  FD_ZERO(&writefds);
  FD_SET(sock, &writefds);

  struct timeval tv;
  tv.tv_sec = timeoutMs / 1000;
  tv.tv_usec = (timeoutMs % 1000) * 1000;

  result = select(sock + 1, nullptr, &writefds, nullptr, &tv);
  if (result <= 0) {
    close(sock);
    return false;
  }

  // Check if connection succeeded
  int error = 0;
  socklen_t len = sizeof(error);
  getsockopt(sock, SOL_SOCKET, SO_ERROR, &error, &len);
  if (error != 0) {
    close(sock);
    return false;
  }

  // Connection established - wait for DeviceInfo
  // Set blocking with timeout for recv
  fcntl(sock, F_SETFL, 0); // Clear non-blocking
  struct timeval recvTimeout;
  recvTimeout.tv_sec = 0;
  recvTimeout.tv_usec = 500000; // 500ms timeout for DeviceInfo
  setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &recvTimeout, sizeof(recvTimeout));

  // Read header
  reanimated::DevToolsMessageHeader header;
  ssize_t bytesRead = recv(sock, &header, sizeof(header), MSG_WAITALL);
  if (bytesRead != sizeof(header)) {
    close(sock);
    return false;
  }

  // Validate header
  if (header.magic != reanimated::DevToolsMessageHeader::MAGIC) {
    device.errorMessage = "Wrong protocol (bad magic)";
    close(sock);
    return false;
  }

  if (header.version != reanimated::DevToolsMessageHeader::VERSION) {
    device.errorMessage = "Protocol v" + std::to_string(header.version) + " (expected v" +
        std::to_string(reanimated::DevToolsMessageHeader::VERSION) + ")";
    close(sock);
    return false;
  }

  if (header.type != reanimated::DevToolsMessageType::DeviceInfo) {
    device.errorMessage = "Unexpected message type";
    close(sock);
    return false;
  }

  if (header.payloadCount != 1) {
    device.errorMessage = "Invalid payload count";
    close(sock);
    return false;
  }

  // Read DeviceInfo
  reanimated::DeviceInfoMessage info;
  bytesRead = recv(sock, &info, sizeof(info), MSG_WAITALL);
  if (bytesRead != sizeof(info)) {
    close(sock);
    return false;
  }

  // Populate device info
  device.deviceName = info.deviceName;
  device.internalPort = info.port;
  device.appStartTimeNs = info.appStartTimeNs;
  device.bufferedProfilerEvents = info.bufferedProfilerEvents;
  device.bufferedMutations = info.bufferedMutations;
  device.valid = true;

  // Close the probe connection
  close(sock);
  return true;
}

// Global socket for active connection
int g_connectedSocket = -1;

} // namespace

void scanForDevices(app::AppState &state, bool hardRefresh) {
  std::vector<app::DiscoveredDevice> devices;
  std::set<uint16_t> existingPorts;

  {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionState = app::ConnectionState::Scanning;
    if (hardRefresh) {
      // Hard refresh: clear all existing devices
      state.data.discoveredDevices.clear();
    } else {
      // Soft refresh: keep existing devices, only scan missing ports
      devices = state.data.discoveredDevices;
      for (const auto &dev : devices) {
        existingPorts.insert(dev.port);
      }
    }
  }

  // Scan ports
  for (uint16_t port = PORT_START; port <= PORT_END; ++port) {
    // Skip ports we already have (unless doing hard refresh)
    if (!hardRefresh && existingPorts.count(port) > 0) {
      continue;
    }

    app::DiscoveredDevice device;
    device.valid = false;
    device.port = port;

    int timeout = getTimeoutForPort(port);
    probePort(port, device, timeout);
    // Add device to list if valid OR if we have an error message
    // (error message means TCP connected but handshake failed)
    if (device.valid || !device.errorMessage.empty()) {
      devices.push_back(device);
    }

    // Check if we should stop
    if (!state.data.running.load())
      break;
  }

  {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.discoveredDevices = std::move(devices);
    if (state.data.connectionState == app::ConnectionState::Scanning) {
      state.data.connectionState = app::ConnectionState::Disconnected;
    }
  }
}

bool connectToDevice(app::AppState &state, uint16_t port) {
  // Clear all previous data before connecting to a new device
  {
    std::lock_guard<std::mutex> snapshotLock(state.data.snapshotMutex);
    state.data.snapshots.clear();
    state.data.currentTree.clear();
    state.data.currentRoots.clear();
    state.data.currentSnapshotIndex = -1;
    state.data.snapshotCounter = 0;
  }
  {
    std::lock_guard<std::mutex> profilerLock(state.data.profilerMutex);
    state.data.threadTimelines.clear();
    state.data.profilerStrings.clear();
    state.data.threadNames.clear();
  }
  {
    std::lock_guard<std::mutex> connLock(state.data.connectionMutex);
    state.data.disconnectReason.clear();
    state.data.connectionError.clear();
  }

  // Create socket
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  if (sock < 0) {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionError = "Failed to create socket";
    return false;
  }

  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(port);
  addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

  if (connect(sock, reinterpret_cast<struct sockaddr *>(&addr), sizeof(addr)) < 0) {
    close(sock);
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionError = "Failed to connect to port " + std::to_string(port);
    return false;
  }

  // Server sends DeviceInfo immediately after accept
  // Read it (blocking with timeout)
  reanimated::DevToolsMessageHeader header;
  ssize_t bytesRead = recv(sock, &header, sizeof(header), MSG_WAITALL);
  if (bytesRead != sizeof(header)) {
    close(sock);
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionError = "Failed to read DeviceInfo header";
    return false;
  }

  if (header.magic != reanimated::DevToolsMessageHeader::MAGIC ||
      header.version != reanimated::DevToolsMessageHeader::VERSION ||
      header.type != reanimated::DevToolsMessageType::DeviceInfo) {
    close(sock);
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionError = "Invalid DeviceInfo message";
    return false;
  }

  reanimated::DeviceInfoMessage deviceInfo;
  bytesRead = recv(sock, &deviceInfo, sizeof(deviceInfo), MSG_WAITALL);
  if (bytesRead != sizeof(deviceInfo)) {
    close(sock);
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionError = "Failed to read DeviceInfo payload";
    return false;
  }

  // Now send ClientReady to complete handshake
  reanimated::DevToolsMessageHeader clientReadyHeader(reanimated::DevToolsMessageType::ClientReady, 0);
  if (send(sock, &clientReadyHeader, sizeof(clientReadyHeader), 0) != sizeof(clientReadyHeader)) {
    close(sock);
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionError = "Failed to send ClientReady";
    return false;
  }

  // Set non-blocking for data receiving
  fcntl(sock, F_SETFL, O_NONBLOCK);

  g_connectedSocket = sock;

  {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionState = app::ConnectionState::Connected;
    state.data.connectedPort = port;
    state.data.connectionError.clear();
    // Hide connection window now that we're connected
    state.ui.showConnectionWindow = false;
  }

  std::cout << "Connected to device on port " << port << " (buffered: " << deviceInfo.bufferedProfilerEvents
            << " events, " << deviceInfo.bufferedMutations << " mutations)\n";
  return true;
}

void disconnect(app::AppState &state) {
  if (g_connectedSocket >= 0) {
    close(g_connectedSocket);
    g_connectedSocket = -1;
  }

  {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    state.data.connectionState = app::ConnectionState::Disconnected;
    state.data.connectedPort = 0;
    // Clear device list so it gets repolled on reconnect
    // This ensures we don't show stale device info
    state.data.discoveredDevices.clear();
    state.data.selectedDeviceIndex = -1;
  }

  // NOTE: We do NOT clear mutation/profiler data here.
  // The data persists until we connect to a NEW device.
  // This allows users to analyze data after disconnect.
}

void networkThread(app::AppState &state) {
  constexpr size_t BUFFER_SIZE = 65536;
  std::vector<uint8_t> buffer(BUFFER_SIZE);
  std::vector<uint8_t> pendingData;

  while (state.data.running) {
    // Check connection state
    app::ConnectionState connState;
    {
      std::lock_guard<std::mutex> lock(state.data.connectionMutex);
      connState = state.data.connectionState;
    }

    if (connState != app::ConnectionState::Connected || g_connectedSocket < 0) {
      // Not connected - sleep and retry
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
      continue;
    }

    // Read from socket
    ssize_t bytesRead = recv(g_connectedSocket, buffer.data(), buffer.size(), 0);
    if (bytesRead > 0) {
      pendingData.insert(pendingData.end(), buffer.begin(), buffer.begin() + bytesRead);

      // Process complete messages
      while (pendingData.size() >= sizeof(reanimated::DevToolsMessageHeader)) {
        reanimated::DevToolsMessageHeader header;
        memcpy(&header, pendingData.data(), sizeof(header));

        if (header.magic != reanimated::DevToolsMessageHeader::MAGIC) {
          std::cerr << "Invalid magic number, clearing pending data\n";
          pendingData.clear();
          break;
        }

        // Version check (strict)
        if (header.version != reanimated::DevToolsMessageHeader::VERSION) {
          std::cerr << "Protocol version mismatch (app: " << header.version
                    << ", devtools: " << reanimated::DevToolsMessageHeader::VERSION << ")\n";
          disconnect(state);
          {
            std::lock_guard<std::mutex> lock(state.data.connectionMutex);
            state.data.disconnectReason = "Protocol version mismatch";
          }
          pendingData.clear();
          break;
        }

        // Calculate payload size based on message type
        size_t payloadSize = 0;
        switch (header.type) {
          case reanimated::DevToolsMessageType::Mutations:
            payloadSize = header.payloadCount * sizeof(reanimated::SimpleMutation);
            break;
          case reanimated::DevToolsMessageType::ProfilerStringRegistry:
            payloadSize = header.payloadCount * sizeof(reanimated::ProfilerStringEntry);
            break;
          case reanimated::DevToolsMessageType::ProfilerEvents:
            payloadSize = header.payloadCount * sizeof(reanimated::ProfilerEvent);
            break;
          case reanimated::DevToolsMessageType::ThreadMetadata:
            payloadSize = header.payloadCount * sizeof(reanimated::ThreadMetadata);
            break;
          case reanimated::DevToolsMessageType::DeviceInfo:
            payloadSize = header.payloadCount * sizeof(reanimated::DeviceInfoMessage);
            break;
          case reanimated::DevToolsMessageType::ConnectionRejected:
            payloadSize = header.payloadCount * sizeof(reanimated::ConnectionRejectedMessage);
            break;
          default:
            std::cerr << "Unknown message type: " << static_cast<int>(header.type) << "\n";
            pendingData.clear();
            continue;
        }

        size_t expectedSize = sizeof(reanimated::DevToolsMessageHeader) + payloadSize;

        if (pendingData.size() < expectedSize) {
          break; // Wait for more data
        }

        // Process based on message type
        const uint8_t *payloadPtr = pendingData.data() + sizeof(reanimated::DevToolsMessageHeader);

        switch (header.type) {
          case reanimated::DevToolsMessageType::Mutations: {
            std::vector<reanimated::SimpleMutation> mutations(header.payloadCount);
            memcpy(mutations.data(), payloadPtr, payloadSize);
            applyMutations(state, mutations, header.timestampNs);
            break;
          }

          case reanimated::DevToolsMessageType::ProfilerStringRegistry: {
            for (uint32_t i = 0; i < header.payloadCount; ++i) {
              reanimated::ProfilerStringEntry entry;
              memcpy(&entry, payloadPtr + i * sizeof(reanimated::ProfilerStringEntry), sizeof(entry));
              entry.name[sizeof(entry.name) - 1] = '\0';
              registerProfilerString(state, entry.stringId, entry.name);
            }
            break;
          }

          case reanimated::DevToolsMessageType::ProfilerEvents: {
            for (uint32_t i = 0; i < header.payloadCount; ++i) {
              reanimated::ProfilerEvent event;
              memcpy(&event, payloadPtr + i * sizeof(reanimated::ProfilerEvent), sizeof(event));
              recordProfilerEvent(state, event);
            }
            break;
          }

          case reanimated::DevToolsMessageType::ThreadMetadata: {
            for (uint32_t i = 0; i < header.payloadCount; ++i) {
              reanimated::ThreadMetadata metadata;
              memcpy(&metadata, payloadPtr + i * sizeof(reanimated::ThreadMetadata), sizeof(metadata));
              metadata.threadName[sizeof(metadata.threadName) - 1] = '\0';
              recordThreadMetadata(state, metadata.threadId, metadata.threadName);
            }
            break;
          }

          case reanimated::DevToolsMessageType::DeviceInfo: {
            // DeviceInfo received after connect - we can ignore it since we already got it during probe
            // But we could use it to update the UI if needed
            break;
          }

          case reanimated::DevToolsMessageType::ConnectionRejected: {
            reanimated::ConnectionRejectedMessage msg;
            memcpy(&msg, payloadPtr, sizeof(msg));
            msg.reason[sizeof(msg.reason) - 1] = '\0';
            std::cerr << "Connection rejected: " << msg.reason << "\n";
            disconnect(state);
            {
              std::lock_guard<std::mutex> lock(state.data.connectionMutex);
              state.data.disconnectReason = msg.reason;
            }
            break;
          }

          case reanimated::DevToolsMessageType::ClientReady:
            // Client should never receive this - it's a client-to-server message
            break;
        }

        pendingData.erase(pendingData.begin(), pendingData.begin() + expectedSize);
      }
    } else if (bytesRead == 0) {
      // Connection closed by peer
      std::cout << "Connection closed by device\n";
      disconnect(state);
      {
        std::lock_guard<std::mutex> lock(state.data.connectionMutex);
        state.data.disconnectReason = "Connection closed by device";
      }
      pendingData.clear();
    } else if (errno != EAGAIN && errno != EWOULDBLOCK) {
      // Error
      std::cerr << "Socket error: " << strerror(errno) << "\n";
      disconnect(state);
      {
        std::lock_guard<std::mutex> lock(state.data.connectionMutex);
        state.data.disconnectReason = "Socket error";
      }
      pendingData.clear();
    }

    // Small sleep to prevent busy loop when no data
    std::this_thread::sleep_for(std::chrono::milliseconds(10));
  }

  // Cleanup
  if (g_connectedSocket >= 0) {
    close(g_connectedSocket);
    g_connectedSocket = -1;
  }
}

} // namespace data
