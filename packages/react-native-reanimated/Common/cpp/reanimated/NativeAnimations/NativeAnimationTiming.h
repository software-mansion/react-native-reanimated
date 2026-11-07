#pragma once

#include <variant>

namespace reanimated::native_animation {

struct LinearTiming {};

struct CubicBezierTiming {
  double x1{0};
  double y1{0};
  double x2{0};
  double y2{0};
};

using AnimationTiming = std::variant<LinearTiming, CubicBezierTiming>;

bool isValid(const AnimationTiming &timing);

} // namespace reanimated::native_animation
