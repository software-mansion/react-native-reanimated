#include <reanimated/NativeAnimations/NativeAnimationTiming.h>

#include <algorithm>
#include <cmath>
#include <type_traits>

namespace reanimated::native_animation {

bool isFinite(const AnimationTiming &timing) {
  return std::visit(
      [](const auto &typedTiming) {
        using T = std::decay_t<decltype(typedTiming)>;
        if constexpr (std::is_same_v<T, LinearTiming>) {
          return true;
        } else if constexpr (std::is_same_v<T, CubicBezier>) {
          return std::isfinite(typedTiming.x1) && std::isfinite(typedTiming.y1) && std::isfinite(typedTiming.x2) &&
              std::isfinite(typedTiming.y2) && typedTiming.x1 >= 0 && typedTiming.x1 <= 1 && typedTiming.x2 >= 0 &&
              typedTiming.x2 <= 1;
        } else {
          return std::ranges::all_of(typedTiming.points, [](const AnimationTimingPoint &point) {
            return std::isfinite(point.input) && std::isfinite(point.output) && point.input >= 0 && point.input <= 1;
          });
        }
      },
      timing);
}

bool hasOrderedTimingPoints(const AnimationTiming &timing) {
  return std::visit(
      [](const auto &typedTiming) {
        using T = std::decay_t<decltype(typedTiming)>;
        if constexpr (std::is_same_v<T, StepsTiming> || std::is_same_v<T, LinearStopsTiming>) {
          return !typedTiming.points.empty() &&
              std::ranges::is_sorted(typedTiming.points, {}, &AnimationTimingPoint::input);
        }
        return true;
      },
      timing);
}

} // namespace reanimated::native_animation
