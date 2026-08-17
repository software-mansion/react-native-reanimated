#pragma once

#include <variant>
#include <vector>

namespace reanimated::native_animation {

struct LinearTiming {
  bool operator==(const LinearTiming &) const = default;
};

struct CubicBezier {
  double x1{0};
  double y1{0};
  double x2{0};
  double y2{0};

  bool operator==(const CubicBezier &) const = default;
};

struct AnimationTimingPoint {
  double input{0};
  double output{0};

  bool operator==(const AnimationTimingPoint &) const = default;
};

struct StepsTiming {
  std::vector<AnimationTimingPoint> points;

  bool operator==(const StepsTiming &) const = default;
};

struct LinearStopsTiming {
  std::vector<AnimationTimingPoint> points;

  bool operator==(const LinearStopsTiming &) const = default;
};

using AnimationTiming = std::variant<LinearTiming, CubicBezier, StepsTiming, LinearStopsTiming>;

bool isFinite(const AnimationTiming &timing);
bool hasOrderedTimingPoints(const AnimationTiming &timing);

} // namespace reanimated::native_animation
