#include "windows/controls_window.h"
#include <imgui.h>
#include <sstream>
#include "data/network_handler.h"

namespace windows {

void renderControlsWindow(app::AppState &state) {
  ImGui::Begin("Controls");

  // Connection status indicator
  app::ConnectionState connState;
  std::string connectionError;
  std::string disconnectReason;
  int connectedPort = 0;

  {
    std::lock_guard<std::mutex> lock(state.data.connectionMutex);
    connState = state.data.connectionState;
    connectionError = state.data.connectionError;
    disconnectReason = state.data.disconnectReason;
    connectedPort = state.data.connectedPort;
  }

  if (connState == app::ConnectionState::Connected) {
    ImGui::TextColored(ImVec4(0.2f, 0.9f, 0.2f, 1.0f), "Connected (port %d)", connectedPort);
  } else {
    ImVec4 indicatorColor =
        (connState == app::ConnectionState::Scanning) ? ImVec4(0.9f, 0.6f, 0.2f, 1.0f) : ImVec4(0.9f, 0.2f, 0.2f, 1.0f);
    const char *statusText = (connState == app::ConnectionState::Scanning) ? "Scanning..." : "Disconnected";
    ImGui::TextColored(indicatorColor, "%s", statusText);
    if (ImGui::Button("Reconnect")) {
      state.ui.showConnectionWindow = true;
    }
  }

  // Show connection error if any
  if (!connectionError.empty()) {
    ImGui::TextColored(ImVec4(1.0f, 0.4f, 0.4f, 1.0f), "Error: %s", connectionError.c_str());
  }

  // Show disconnect reason if we just disconnected
  if (!disconnectReason.empty()) {
    ImGui::TextColored(ImVec4(1.0f, 0.6f, 0.4f, 1.0f), "Disconnected: %s", disconnectReason.c_str());
  }

  ImGui::Separator();

  {
    std::lock_guard<std::mutex> lock(state.data.snapshotMutex);

    ImGui::Text("Snapshots: %zu", state.data.snapshots.size());

    if (!state.data.snapshots.empty()) {
      ImGui::SliderInt(
          "Snapshot", &state.data.currentSnapshotIndex, 0, static_cast<int>(state.data.snapshots.size()) - 1);

      if (ImGui::Button("< Prev") && state.data.currentSnapshotIndex > 0) {
        state.data.currentSnapshotIndex--;
      }
      ImGui::SameLine();
      if (ImGui::Button("Next >") &&
          state.data.currentSnapshotIndex < static_cast<int>(state.data.snapshots.size()) - 1) {
        state.data.currentSnapshotIndex++;
      }
      ImGui::SameLine();
      if (ImGui::Button("Latest")) {
        state.data.currentSnapshotIndex = static_cast<int>(state.data.snapshots.size()) - 1;
      }

      if (state.data.currentSnapshotIndex >= 0 &&
          state.data.currentSnapshotIndex < static_cast<int>(state.data.snapshots.size())) {
        ImGui::Text("%s", state.data.snapshots[state.data.currentSnapshotIndex].label.c_str());
      }
    }

    if (ImGui::Button("Clear All")) {
      state.data.snapshots.clear();
      state.data.currentTree.clear();
      state.data.currentRoots.clear();
      state.data.currentSnapshotIndex = -1;
      state.data.snapshotCounter = 0;
    }
  }

  ImGui::Separator();
  ImGui::SliderFloat("Scale", &state.ui.viewScale, 0.1f, 2.0f);
  ImGui::DragFloat2("Offset", &state.ui.viewOffset.x);

  ImGui::Separator();
  ImGui::Text("3D View:");
  ImGui::SliderFloat("Rotation", &state.ui.rotationDeg, -90.0f, 90.0f, "%.1f deg");
  ImGui::SliderFloat("Depth Spacing", &state.ui.depthSpacing, 0.0f, 200.0f);
  ImGui::Text("View Mode:");
  ImGui::RadioButton("Layered", &state.ui.viewModeInt, 0);
  ImGui::SameLine();
  ImGui::RadioButton("True 3D", &state.ui.viewModeInt, 1);
  if (ImGui::Button("Reset 3D")) {
    state.ui.rotationDeg = 0.0f;
    state.ui.depthSpacing = 50.0f;
  }

  ImGui::Separator();
  ImGui::Text("Hidden Tags (comma-separated):");
  if (ImGui::InputText("##hiddentags", state.ui.hiddenTagsInput, sizeof(state.ui.hiddenTagsInput))) {
    // Parse the input and update hiddenTags set
    state.ui.hiddenTags.clear();
    std::stringstream ss(state.ui.hiddenTagsInput);
    std::string token;
    while (std::getline(ss, token, ',')) {
      // Trim whitespace
      size_t start = token.find_first_not_of(" \t");
      size_t end = token.find_last_not_of(" \t");
      if (start != std::string::npos && end != std::string::npos) {
        token = token.substr(start, end - start + 1);
        try {
          int32_t tag = std::stoi(token);
          state.ui.hiddenTags.insert(tag);
        } catch (...) {
          // Ignore invalid numbers
        }
      }
    }
  }
  if (!state.ui.hiddenTags.empty()) {
    ImGui::Text("Hiding %zu tags", state.ui.hiddenTags.size());
  }

  ImGui::Separator();

  ImGui::Checkbox("Show Background Colors", &state.ui.showBackgroundColor);

  ImGui::Separator();

  ImGui::Checkbox("Adjust RNScreens Headers", &state.ui.adjustRNSScreensHeaders);

  ImGui::Separator();

  ImGui::Text("Legend:");
  ImGui::TextColored(ImVec4(0.4f, 0.8f, 0.4f, 1.0f), "CREATE");
  ImGui::TextColored(ImVec4(0.8f, 0.4f, 0.4f, 1.0f), "DELETE");
  ImGui::TextColored(ImVec4(0.4f, 0.6f, 0.8f, 1.0f), "INSERT");
  ImGui::TextColored(ImVec4(0.8f, 0.6f, 0.4f, 1.0f), "REMOVE");
  ImGui::TextColored(ImVec4(0.8f, 0.8f, 0.4f, 1.0f), "UPDATE");

  ImGui::End();
}

} // namespace windows
