#include "windows/connection_window.h"

#include <imgui.h>

#include <atomic>
#include <chrono>
#include <thread>

#include "data/network_handler.h"

namespace windows {

namespace {

// Track if a scan is currently in progress
bool g_scanInProgress = false;
std::thread g_scanThread;

// Auto-refresh state (always runs, only scans unknown ports)
std::atomic<bool> g_autoRefreshRunning{false};
std::thread g_autoRefreshThread;
constexpr auto AUTO_REFRESH_INTERVAL = std::chrono::seconds(3);

void startScan(app::AppState &state, bool hardRefresh = false) {
  if (g_scanInProgress)
    return;

  // Clean up previous thread if any
  if (g_scanThread.joinable()) {
    g_scanThread.join();
  }

  g_scanInProgress = true;
  g_scanThread = std::thread([&state, hardRefresh]() {
    data::scanForDevices(state, hardRefresh);
    g_scanInProgress = false;
  });
}

void autoRefreshThread(app::AppState &state) {
  while (g_autoRefreshRunning.load()) {
    app::ConnectionState connState;
    {
      std::lock_guard<std::mutex> lock(state.data.connectionMutex);
      connState = state.data.connectionState;
    }

    // Only auto-scan when disconnected (soft refresh - only unknown ports)
    if (connState == app::ConnectionState::Disconnected && !g_scanInProgress) {
      startScan(state, false);
    }

    // Wait for interval or until stopped
    for (int i = 0; i < 30 && g_autoRefreshRunning.load(); ++i) {
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
  }
}

void startAutoRefresh(app::AppState &state) {
  if (g_autoRefreshRunning.load())
    return;

  g_autoRefreshRunning = true;
  g_autoRefreshThread = std::thread([&state]() { autoRefreshThread(state); });
}

void stopAutoRefresh() {
  g_autoRefreshRunning = false;
  if (g_autoRefreshThread.joinable()) {
    g_autoRefreshThread.join();
  }
}

void renderDeviceList(app::AppState &state) {
  app::ConnectionState connState;
  std::vector<app::DiscoveredDevice> devices;
  int selectedIndex;

  {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    connState = state.data.connectionState;
    devices = state.data.discoveredDevices;
    selectedIndex = state.data.selectedDeviceIndex;
  }

  // Header with refresh button and auto-refresh toggle
  if (connState == app::ConnectionState::Scanning || g_scanInProgress) {
    ImGui::Text("Scanning for devices...");
    ImGui::SameLine();
    // Simple spinner animation
    const char *spinner = "|/-\\";
    static int frame = 0;
    ImGui::Text("%c", spinner[(frame++ / 10) % 4]);
  } else {
    ImGui::Text("Available Devices");
    ImGui::SameLine();
    if (ImGui::Button("Refresh")) {
      startScan(state, true);
    }
  }

  ImGui::Separator();

  // Device list
  if (devices.empty() && connState != app::ConnectionState::Scanning && !g_scanInProgress) {
    ImGui::TextColored(ImVec4(0.7f, 0.7f, 0.7f, 1.0f), "No devices found");
    ImGui::TextColored(ImVec4(0.6f, 0.6f, 0.6f, 1.0f), "Click Refresh to scan for devices");
  } else {
    ImGui::BeginChild("DeviceList", ImVec2(0, 150), true);

    for (size_t i = 0; i < devices.size(); ++i) {
      const auto &device = devices[i];
      bool isSelected = (static_cast<int>(i) == selectedIndex);
      ImGui::PushID(static_cast<int>(i));

      if (!device.valid && !device.errorMessage.empty()) {
        // Show device with handshake error (connected but failed validation)
        char label[256];
        snprintf(label, sizeof(label), "Port %d - %s", device.port, device.errorMessage.c_str());

        // Show in orange/red to indicate error
        ImGui::TextColored(ImVec4(0.9f, 0.5f, 0.2f, 1.0f), "%s", label);
        // Not selectable since we can't connect
      } else if (device.valid) {
        // Format device entry for valid devices
        char label[256];
        if (device.port == device.internalPort) {
          snprintf(label, sizeof(label), "%s (port %d)", device.deviceName.c_str(), device.port);
        } else {
          snprintf(
              label,
              sizeof(label),
              "%s (port %d forwarded from %d)",
              device.deviceName.c_str(),
              device.port,
              device.internalPort);
        }

        if (ImGui::Selectable(label, isSelected)) {
          std::lock_guard<std::mutex> lock(state.data.connectionMutex);
          state.data.selectedDeviceIndex = static_cast<int>(i);
        }

        // Show buffer info on same line
        if (device.bufferedProfilerEvents > 0 || device.bufferedMutations > 0) {
          ImGui::SameLine();
          ImGui::TextColored(
              ImVec4(0.6f, 0.8f, 0.6f, 1.0f),
              "[%u events, %u mutations]",
              device.bufferedProfilerEvents,
              device.bufferedMutations);
        }
      }

      ImGui::PopID();
    }

    ImGui::EndChild();
  }

  // Connect button
  bool canConnect = selectedIndex >= 0 && selectedIndex < static_cast<int>(devices.size()) &&
      connState == app::ConnectionState::Disconnected && !g_scanInProgress;

  if (!canConnect) {
    ImGui::BeginDisabled();
  }

  if (ImGui::Button("Connect", ImVec2(100, 0))) {
    if (canConnect) {
      uint16_t port = devices[selectedIndex].port;
      // Connect in a separate thread to not block UI
      std::thread([&state, port]() { data::connectToDevice(state, port); }).detach();
    }
  }

  if (!canConnect) {
    ImGui::EndDisabled();
  }
}

void renderSetupHelp(app::AppState &state) {
  if (ImGui::CollapsingHeader("Device Setup Instructions")) {
    ImGui::Indent();

    ImGui::TextColored(ImVec4(0.4f, 0.8f, 1.0f, 1.0f), "iOS Simulator:");
    ImGui::TextWrapped("  Works automatically - no setup needed");
    ImGui::Spacing();

    ImGui::TextColored(ImVec4(0.4f, 0.8f, 1.0f, 1.0f), "iOS Device (USB):");
    ImGui::TextColored(ImVec4(0.8f, 0.6f, 0.4f, 1.0f), "  Not currently supported");
    ImGui::TextWrapped("  (Requires third-party tools like iproxy)");
    ImGui::Spacing();

    ImGui::TextColored(ImVec4(0.4f, 0.8f, 1.0f, 1.0f), "Android Emulator:");
    ImGui::BulletText("Check app logs for port (e.g., \"DevTools on port 8765\")");
    ImGui::BulletText("Run: adb forward tcp:<PORT> tcp:<PORT>");
    ImGui::BulletText("Click Refresh");
    ImGui::Spacing();

    ImGui::TextColored(ImVec4(0.4f, 0.8f, 1.0f, 1.0f), "Android Device (USB):");
    ImGui::BulletText("Enable USB debugging on device");
    ImGui::BulletText("Connect device via USB");
    ImGui::BulletText("Check app logs for port (e.g., \"DevTools on port 8765\")");
    ImGui::BulletText("Run: adb forward tcp:<PORT> tcp:<PORT>");
    ImGui::BulletText("Click Refresh");
    ImGui::Spacing();

    ImGui::Separator();
    ImGui::TextColored(ImVec4(1.0f, 0.8f, 0.4f, 1.0f), "Not seeing your device?");
    ImGui::BulletText("Verify app is running with DevTools enabled");
    ImGui::BulletText("Check that port appears in app logs");
    ImGui::BulletText("For Android: run 'adb devices' (should list your device)");

    ImGui::Unindent();
  }
}

} // namespace

void renderConnectionWindow(app::AppState &state) {
  // Hide window when connected
  app::ConnectionState connState;
  {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    connState = state.data.connectionState;
  }

  if (connState == app::ConnectionState::Connected) {
    // Stop auto-refresh when connected
    if (g_autoRefreshRunning.load()) {
      stopAutoRefresh();
    }
    return;
  }

  if (!state.ui.showConnectionWindow) {
    return;
  }

  // Start auto-refresh when disconnected
  if (!g_autoRefreshRunning.load()) {
    startAutoRefresh(state);
  }

  // Center the window on first use
  ImGui::SetNextWindowSize(ImVec2(450, 400), ImGuiCond_FirstUseEver);

  if (!ImGui::Begin("Connection", &state.ui.showConnectionWindow)) {
    ImGui::End();
    return;
  }

  renderDeviceList(state);

  ImGui::Separator();
  renderSetupHelp(state);

  ImGui::End();
}

// Cleanup function to be called before shutdown
void cleanupConnectionWindow() {
  stopAutoRefresh();
  if (g_scanThread.joinable()) {
    g_scanThread.join();
  }
}

} // namespace windows
