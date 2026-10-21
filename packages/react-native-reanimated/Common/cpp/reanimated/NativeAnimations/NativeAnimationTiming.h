#pragma once

#include <cstdint>
#include <variant>
#include <vector>

namespace reanimated::native_animation {

struct LinearTiming {};

struct CubicBezierTiming {
  double x1{0};
  double y1{0};
  double x2{0};
  double y2{0};
};

/// The output is `pointsY` of the last point whose `pointsX` is at or before the progress. `pointsX` increases
/// strictly in [0, 1].
struct StepsTiming {
  std::vector<double> pointsX;
  std::vector<double> pointsY;
};

/// Straight lines between the points. `pointsX` goes from 0 to 1 and does not decrease: two points at one
/// progress are a jump.
struct LinearStopsTiming {
  std::vector<double> pointsX;
  std::vector<double> pointsY;
};

using AnimationTiming = std::variant<LinearTiming, CubicBezierTiming, StepsTiming, LinearStopsTiming>;

enum class AnimationTimingKind : uint8_t {
  Linear,
  CubicBezier,
  Steps,
  LinearStops,
};

bool isValid(const AnimationTiming &timing);

AnimationTimingKind kindOf(const AnimationTiming &timing);

} // namespace reanimated::native_animation
