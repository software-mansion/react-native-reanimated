#include "windows/fps_window.h"
#include <imgui.h>

#ifdef ENABLE_FPS_COUNTER

namespace windows {

void renderFpsWindow(app::AppState &state) {
  const ImGuiIO &io = ImGui::GetIO();
  ImGui::SetNextWindowPos(ImVec2(io.DisplaySize.x - 10, 10), ImGuiCond_Always, ImVec2(1.0f, 0.0f));
  ImGui::SetNextWindowBgAlpha(0.5f);
  ImGuiWindowFlags fpsWindowFlags = ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_AlwaysAutoResize |
      ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoFocusOnAppearing | ImGuiWindowFlags_NoNav |
      ImGuiWindowFlags_NoMove;

  if (ImGui::Begin("##FPS", nullptr, fpsWindowFlags)) {
    ImGui::TextColored(ImVec4(0.4f, 1.0f, 0.4f, 1.0f), "%.1f FPS", io.Framerate);
  }
  ImGui::End();
}

} // namespace windows

#endif
