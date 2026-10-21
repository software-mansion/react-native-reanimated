#include <reanimated/NativeAnimations/NativeAnimationTiming.h>

#include <algorithm>
#include <cmath>
#include <functional>

namespace reanimated::native_animation {

namespace {

bool isUnitInterval(const double value) {
  return value >= 0 && value <= 1;
}

template <typename IsOrdered>
bool hasValidPoints(const std::vector<double> &pointsX, const std::vector<double> &pointsY, IsOrdered isOrdered) {
  return pointsX.size() == pointsY.size() && std::ranges::all_of(pointsX, isUnitInterval) &&
      std::ranges::adjacent_find(pointsX, std::not_fn(isOrdered)) == pointsX.end() &&
      std::ranges::all_of(pointsY, [](const double value) { return std::isfinite(value); });
}

struct ValidVisitor {
  bool operator()(const LinearTiming &) const {
    return true;
  }
  bool operator()(const CubicBezierTiming &bezier) const {
    return isUnitInterval(bezier.x1) && isUnitInterval(bezier.x2) && std::isfinite(bezier.y1) &&
        std::isfinite(bezier.y2);
  }
  bool operator()(const StepsTiming &steps) const {
    return !steps.pointsX.empty() && hasValidPoints(steps.pointsX, steps.pointsY, std::less<>{});
  }
  bool operator()(const LinearStopsTiming &stops) const {
    return stops.pointsX.size() >= 2 && hasValidPoints(stops.pointsX, stops.pointsY, std::less_equal<>{}) &&
        stops.pointsX.front() == 0 && stops.pointsX.back() == 1;
  }
};

struct KindVisitor {
  AnimationTimingKind operator()(const LinearTiming &) const {
    return AnimationTimingKind::Linear;
  }
  AnimationTimingKind operator()(const CubicBezierTiming &) const {
    return AnimationTimingKind::CubicBezier;
  }
  AnimationTimingKind operator()(const StepsTiming &) const {
    return AnimationTimingKind::Steps;
  }
  AnimationTimingKind operator()(const LinearStopsTiming &) const {
    return AnimationTimingKind::LinearStops;
  }
};

} // namespace

bool isValid(const AnimationTiming &timing) {
  return std::visit(ValidVisitor{}, timing);
}

AnimationTimingKind kindOf(const AnimationTiming &timing) {
  return std::visit(KindVisitor{}, timing);
}

} // namespace reanimated::native_animation
