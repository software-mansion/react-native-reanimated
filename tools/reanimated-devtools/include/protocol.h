#pragma once

// Re-export shared protocol definitions from Reanimated
// This is the single source of truth for the DevTools protocol
#include "reanimated/Tools/DevToolsProtocol.h"

#include <imgui.h>

namespace reanimated {

// DevTools-specific UI helper (ImGui-dependent)
// Not in shared header because it depends on ImGui
ImU32 mutationTypeToColor(MutationType type);

} // namespace reanimated
