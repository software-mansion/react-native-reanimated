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

/// A spring in the time `t` of its segment, from 0 to 1. `initialVelocity` is in changes of the segment for one
/// segment time. The progress is `1 - y(t)` before `t` 1 and 1 from `t` 1, with
/// `y(t) = e^(-decay t) (cos(frequency t) + (decay - initialVelocity) / frequency sin(frequency t))`, or
/// `y(t) = e^(-decay t) (1 + (decay - initialVelocity) t)` when `frequency` is 0.
struct SpringTiming {
  double decay{0};
  double frequency{0};
  double initialVelocity{0};
};

using AnimationTiming = std::variant<LinearTiming, CubicBezierTiming, StepsTiming, LinearStopsTiming, SpringTiming>;

enum class AnimationTimingKind : uint8_t {
  Linear,
  CubicBezier,
  Steps,
  LinearStops,
  Spring,
};

bool isValid(const AnimationTiming &timing);

AnimationTimingKind kindOf(const AnimationTiming &timing);

} // namespace reanimated::native_animation
