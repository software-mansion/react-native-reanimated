#include "windows/fps_window.h"
#include <imgui.h>
#include <chrono>

#ifdef ENABLE_FPS_COUNTER

namespace windows {

void updateFpsCounter(app::AppState &state) {
  auto now = std::chrono::steady_clock::now();
  auto duration = std::chrono::duration_cast<std::chrono::nanoseconds>(now - state.ui.lastFrameTimePoint);
  state.ui.lastFrameTimePoint = now;

  double frameTimeNs = static_cast<double>(duration.count());

  // Store frame time in rolling buffer
  state.ui.frameTimesNs[state.ui.frameTimeIndex] = frameTimeNs;
  state.ui.frameTimeIndex = (state.ui.frameTimeIndex + 1) % state.ui.frameTimesNs.size();

  if (state.ui.frameTimesRecorded < state.ui.frameTimesNs.size()) {
    state.ui.frameTimesRecorded++;
  }

  // Update sum
  state.ui.frameTimeSumNs = 0.0;
  for (size_t i = 0; i < state.ui.frameTimesRecorded; ++i) {
    state.ui.frameTimeSumNs += state.ui.frameTimesNs[i];
  }
}

void renderFpsWindow(app::AppState &state) {
  const ImGuiIO &io = ImGui::GetIO();
  ImGui::SetNextWindowPos(ImVec2(io.DisplaySize.x - 10, 10), ImGuiCond_Always, ImVec2(1.0f, 0.0f));
  ImGui::SetNextWindowBgAlpha(0.5f);
  ImGuiWindowFlags fpsWindowFlags = ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_AlwaysAutoResize |
      ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoFocusOnAppearing | ImGuiWindowFlags_NoNav |
      ImGuiWindowFlags_NoMove;

  if (ImGui::Begin("##FPS", nullptr, fpsWindowFlags)) {
    ImGui::TextColored(ImVec4(0.4f, 1.0f, 0.4f, 1.0f), "%.1f FPS", io.Framerate);

    if (state.ui.frameTimesRecorded > 0) {
      double avgFrameTimeNs = state.ui.frameTimeSumNs / state.ui.frameTimesRecorded;
      double avgFrameTimeMs = avgFrameTimeNs / 1000000.0;
      ImGui::TextColored(ImVec4(0.7f, 0.9f, 0.7f, 1.0f), "Avg: %.2f ms", avgFrameTimeMs);
    }
  }
  ImGui::End();
}

} // namespace windows

#endif
