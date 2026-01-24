#include "windows/mutations_window.h"
#include <imgui.h>
#include "protocol.h"

namespace windows {

void renderMutationsWindow(app::AppState &state) {
  ImGui::Begin("Mutations");
  {
    std::lock_guard<std::mutex> lock(state.data.snapshotMutex);

    if (state.data.currentSnapshotIndex >= 0 &&
        state.data.currentSnapshotIndex < static_cast<int>(state.data.snapshots.size())) {
      const auto &snapshot = state.data.snapshots[state.data.currentSnapshotIndex];

      for (size_t i = 0; i < snapshot.mutations.size(); ++i) {
        const auto &mut = snapshot.mutations[i];
        ImU32 color = reanimated::mutationTypeToColor(mut.type);
        ImGui::PushStyleColor(ImGuiCol_Text, color);
        ImGui::Text(
            "[%zu] %s tag=%d parent=%d idx=%d %s (%.0f,%.0f,%.0f,%.0f)",
            i,
            reanimated::mutationTypeToString(mut.type),
            mut.tag,
            mut.parentTag,
            mut.index,
            mut.componentName,
            mut.x,
            mut.y,
            mut.width,
            mut.height);
        ImGui::PopStyleColor();
      }
    }
  }
  ImGui::End();
}

} // namespace windows
