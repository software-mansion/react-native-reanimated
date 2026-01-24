#pragma once

// Application-wide constants
namespace app {

// Profiler timeline rendering
constexpr float PROFILER_ROW_HEIGHT = 24.0f;
constexpr float PROFILER_ROW_SPACING = 4.0f;
constexpr float PROFILER_HEADER_WIDTH = 150.0f;
constexpr float PROFILER_EVENT_HEIGHT = 18.0f; // Height of individual event bar
constexpr float PROFILER_EVENT_SPACING = 2.0f; // Spacing between event lanes

// Profiler pan/zoom speeds
constexpr float PAN_SPEED_FACTOR = 0.1f;
constexpr double ZOOM_SPEED = 1.2;

} // namespace app
