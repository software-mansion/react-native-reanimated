#include <reanimated/NativeAnimations/NativeAnimationTiming.h>

#include <algorithm>
#include <cmath>
#include <functional>
#include <numbers>
#include <type_traits>

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
  bool operator()(const SpringTiming &spring) const {
    return std::isfinite(spring.decay) && std::isfinite(spring.frequency) && std::isfinite(spring.initialVelocity) &&
        spring.decay > 0 && spring.frequency >= 0;
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
  AnimationTimingKind operator()(const SpringTiming &) const {
    return AnimationTimingKind::Spring;
  }
};

/// The largest `|y(t)|` of a spring (`SpringTiming`). With no initial velocity the spring does not pass its
/// start, so the bound is 1.
double springDisplacementBoundOf(const SpringTiming &spring) {
  if (spring.initialVelocity == 0) {
    return 1;
  }
  const double coefficient = spring.decay - spring.initialVelocity;
  if (spring.frequency == 0) {
    return 1 + std::abs(coefficient) / (spring.decay * std::numbers::e);
  }
  return std::hypot(1.0, coefficient / spring.frequency);
}

} // namespace

bool isValid(const AnimationTiming &timing) {
  return std::visit(ValidVisitor{}, timing);
}

AnimationTimingKind kindOf(const AnimationTiming &timing) {
  return std::visit(KindVisitor{}, timing);
}

std::pair<double, double> narrowProgressRangeOf(const AnimationTiming &timing) {
  const auto *spring = std::get_if<SpringTiming>(&timing);
  if (spring == nullptr || spring->initialVelocity != 0) {
    return progressRangeOf(timing);
  }
  if (spring->frequency == 0) {
    return {0.0, 1.0};
  }
  return {0.0, 1 + std::exp(-spring->decay * std::numbers::pi / spring->frequency)};
}

std::pair<double, double> progressRangeOf(const AnimationTiming &timing) {
  const auto rangeWith = [](const std::vector<double> &values) {
    const auto [least, largest] = std::ranges::minmax(values);
    return std::pair{std::min(0.0, least), std::max(1.0, largest)};
  };
  return std::visit(
      [&rangeWith](const auto &each) -> std::pair<double, double> {
        using Timing = std::decay_t<decltype(each)>;
        if constexpr (std::is_same_v<Timing, LinearTiming>) {
          return {0.0, 1.0};
        } else if constexpr (std::is_same_v<Timing, CubicBezierTiming>) {
          return rangeWith({each.y1, each.y2});
        } else if constexpr (std::is_same_v<Timing, SpringTiming>) {
          const double bound = springDisplacementBoundOf(each);
          return {1 - bound, 1 + bound};
        } else {
          return rangeWith(each.pointsY);
        }
      },
      timing);
}

} // namespace reanimated::native_animation
