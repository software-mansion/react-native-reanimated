#pragma once

#include "app_state.h"

namespace windows {

#ifdef ENABLE_FPS_COUNTER
void renderFpsWindow(app::AppState &state);
void updateFpsCounter(app::AppState &state);
#endif

} // namespace windows
