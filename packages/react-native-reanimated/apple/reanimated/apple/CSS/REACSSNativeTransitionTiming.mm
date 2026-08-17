#import <reanimated/apple/CSS/REACSSNativeTransitionTiming.h>

#import <algorithm>
#import <cmath>
#import <limits>
#import <optional>
#import <type_traits>
#import <variant>

namespace reanimated::css {

namespace {

using namespace native_animation;

// FUTURE: A steps or linear-stops easing needs a native discrete or keyframe
// track form. Until one exists, the build fails here and the property stays on
// the CSS loop. Do not map an unknown easing to linear; that would change the
// animation when the route gate widens.
std::optional<AnimationTiming> timingFromEasing(const EasingConfig &easing)
{
  if (const auto *bezier = std::get_if<CubicBezierEasing>(&easing)) {
    return AnimationTiming{CubicBezier{bezier->x1, bezier->y1, bezier->x2, bezier->y2}};
  }
  if (std::holds_alternative<LinearEasing>(easing)) {
    return AnimationTiming{LinearTiming{}};
  }
  return std::nullopt;
}

struct TimingPoint {
  double x;
  double y;
};

TimingPoint interpolatePoint(const TimingPoint from, const TimingPoint to, const double progress)
{
  return {from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress};
}

TimingPoint cubicPoint(const CubicBezierEasing &curve, const double parameter)
{
  const auto first = interpolatePoint({0, 0}, {curve.x1, curve.y1}, parameter);
  const auto second = interpolatePoint({curve.x1, curve.y1}, {curve.x2, curve.y2}, parameter);
  const auto third = interpolatePoint({curve.x2, curve.y2}, {1, 1}, parameter);
  const auto fourth = interpolatePoint(first, second, parameter);
  const auto fifth = interpolatePoint(second, third, parameter);
  return interpolatePoint(fourth, fifth, parameter);
}

double parameterForInputProgress(const CubicBezierEasing &curve, const double inputProgress)
{
  double lower = 0;
  double upper = 1;
  for (size_t iteration = 0; iteration < 24; ++iteration) {
    const double middle = (lower + upper) / 2;
    if (cubicPoint(curve, middle).x < inputProgress) {
      lower = middle;
    } else {
      upper = middle;
    }
  }
  return (lower + upper) / 2;
}

struct AdvancedTiming {
  double valueProgress;
  AnimationTiming remainingTiming;
};

std::optional<AdvancedTiming> advanceTiming(const EasingConfig &easing, const double inputProgress)
{
  if (const auto *curve = std::get_if<CubicBezierEasing>(&easing)) {
    const double parameter = parameterForInputProgress(*curve, inputProgress);
    const auto first = interpolatePoint({0, 0}, {curve->x1, curve->y1}, parameter);
    const auto second = interpolatePoint({curve->x1, curve->y1}, {curve->x2, curve->y2}, parameter);
    const auto third = interpolatePoint({curve->x2, curve->y2}, {1, 1}, parameter);
    const auto fourth = interpolatePoint(first, second, parameter);
    const auto fifth = interpolatePoint(second, third, parameter);
    const auto split = interpolatePoint(fourth, fifth, parameter);
    const double remainingX = 1 - split.x;
    const double remainingY = 1 - split.y;
    if (std::abs(remainingX) <= std::numeric_limits<double>::epsilon()) {
      return AdvancedTiming{1, LinearTiming{}};
    }
    if (std::abs(remainingY) <= std::numeric_limits<double>::epsilon()) {
      // One basic animation cannot represent a curve that reaches its end
      // value early and then moves away from it. Let the CSS loop run it.
      return std::nullopt;
    }
    return AdvancedTiming{
        split.y,
        CubicBezier{
            (fifth.x - split.x) / remainingX,
            (fifth.y - split.y) / remainingY,
            (third.x - split.x) / remainingX,
            (third.y - split.y) / remainingY,
        },
    };
  }
  if (std::holds_alternative<LinearEasing>(easing)) {
    return AdvancedTiming{inputProgress, LinearTiming{}};
  }
  // See timingFromEasing: steps and linear-stops easings stay on the CSS loop.
  return std::nullopt;
}

PlatformValue interpolateValue(const PlatformValue &fromValue, const PlatformValue &toValue, const double progress)
{
  return std::visit(
      [progress](const auto &from, const auto &to) -> PlatformValue {
        using T = std::decay_t<decltype(from)>;
        if constexpr (!std::is_same_v<T, std::decay_t<decltype(to)>>) {
          return from;
        } else if constexpr (std::is_same_v<T, double>) {
          return from + (to - from) * progress;
        } else if constexpr (std::is_same_v<T, AnimationSize>) {
          return AnimationSize{
              from.width + (to.width - from.width) * progress,
              from.height + (to.height - from.height) * progress,
          };
        } else if constexpr (std::is_same_v<T, AnimationColor>) {
          return AnimationColor{
              from.red + (to.red - from.red) * progress,
              from.green + (to.green - from.green) * progress,
              from.blue + (to.blue - from.blue) * progress,
              from.alpha + (to.alpha - from.alpha) * progress,
          };
        } else {
          return from;
        }
      },
      fromValue,
      toValue);
}

} // namespace

std::optional<CSSNativeTransitionTiming> resolveCSSNativeTransitionTiming(
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const EasingConfig &easing,
    const double delayMs,
    const double durationMs)
{
  if (delayMs >= 0) {
    const auto timing = timingFromEasing(easing);
    if (!timing) {
      return std::nullopt;
    }
    return CSSNativeTransitionTiming{fromValue, delayMs, durationMs, *timing};
  }

  const double inputProgress = durationMs > 0 ? std::clamp(-delayMs / durationMs, 0.0, 1.0) : 1.0;
  const auto advanced = advanceTiming(easing, inputProgress);
  if (!advanced) {
    return std::nullopt;
  }
  return CSSNativeTransitionTiming{
      interpolateValue(fromValue, toValue, advanced->valueProgress),
      0,
      std::max(0.0, durationMs + delayMs),
      advanced->remainingTiming,
  };
}

} // namespace reanimated::css
