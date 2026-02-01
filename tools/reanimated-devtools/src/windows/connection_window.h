#pragma once

#include "app_state.h"

namespace windows {

// Renders the device connection window
// Shows discovered devices, connection controls, and setup instructions
void renderConnectionWindow(app::AppState &state);

// Cleanup function to be called before shutdown
void cleanupConnectionWindow();

} // namespace windows
