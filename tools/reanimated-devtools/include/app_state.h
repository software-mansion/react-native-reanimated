#pragma once

#include <imgui.h>
#include <sys/types.h>
#include <atomic>
#include <cstdint>
#include <mutex>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>
#include "data_structures.h"

// Application state - split into data and UI components
namespace app {

// Connection states
enum class ConnectionState : std::uint8_t { Disconnected, Scanning, Connected };

// Discovered device info
struct DiscoveredDevice {
  std::string deviceName;
  uint16_t internalPort; // Port reported by the device
  uint16_t port; // Port we tried to connect to
  uint64_t appStartTimeNs;
  uint32_t bufferedProfilerEvents;
  uint32_t bufferedMutations;
  bool valid; // Set to true if DeviceInfo was received and validated
  std::string errorMessage; // Set if connection succeeded but handshake failed
};

// Thread-safe data state (protected by mutexes)
struct DataState {
  // Connection state (protected by connectionMutex)
  std::mutex connectionMutex;
  ConnectionState connectionState{ConnectionState::Disconnected};
  std::vector<DiscoveredDevice> discoveredDevices;
  int selectedDeviceIndex{-1};
  int connectedPort{0};
  std::string connectionError;
  std::string disconnectReason;

  // Snapshots & view tree (protected by snapshotMutex)
  std::mutex snapshotMutex;
  std::vector<TreeSnapshot> snapshots;
  int currentSnapshotIndex = -1;
  std::unordered_map<int32_t, ViewNode> currentTree;
  std::vector<int32_t> currentRoots;
  int snapshotCounter = 0;

  // Profiler data (protected by profilerMutex)
  std::mutex profilerMutex;
  std::unordered_map<uint32_t, ThreadTimeline> threadTimelines;
  std::unordered_map<uint32_t, std::string> profilerStrings;
  std::unordered_map<uint32_t, std::string> threadNames; // Thread ID -> human-readable name

  // Lifecycle
  std::atomic<bool> running{true};
};

// UI state (not thread-safe, UI thread only)
struct UIState {
  // View tree visualization
  float viewScale = 0.5f;
  ImVec2 viewOffset{50, 50};
  float rotationDeg = 0.0f;
  float depthSpacing = 50.0f;
  int viewModeInt = 1; // 0=Layered, 1=True3D
  std::set<int32_t> hiddenTags;
  char hiddenTagsInput[256] = "";
  bool showBackgroundColor = false;
  bool adjustRNSScreensHeaders = false;

  // Profiler view state
  double profilerViewEndNs = 0.0;
  double profilerNsPerPixel = 100000.0;
  bool profilerLockToLatest = true;
  HoveredEventInfo hoveredEvent;

  // Connection window state
  bool showConnectionWindow{true};
};

// Main application state - composition of data and UI
struct AppState {
  DataState data;
  UIState ui;
};

} // namespace app
