#pragma once

#include "app_state.h"

namespace data {

// Scan for available devices on the port range
// This should be called from a background thread
// hardRefresh = true: clear existing devices and scan all ports
// hardRefresh = false: only scan ports not already in the discovered list
void scanForDevices(app::AppState &state, bool hardRefresh = false);

// Connect to a specific device (by port)
// Returns true if connection was initiated
bool connectToDevice(app::AppState &state, uint16_t port);

// Disconnect from current device
void disconnect(app::AppState &state);

// Network thread main loop - handles connection and data receiving
void networkThread(app::AppState &state);

} // namespace data
