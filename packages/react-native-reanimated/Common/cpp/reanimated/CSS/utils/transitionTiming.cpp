#include <reanimated/CSS/utils/transitionTiming.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::css {

TransitionTiming makeTiming(double timestamp, double duration, double delay, EasingConfig easing) {
  return {1.0, timestamp + delay, duration, delay, std::move(easing)};
}

double easedProgressAt(const TransitionTiming &timing, const double timestamp) {
  const double elapsed = timestamp - timing.startTimestamp;
  if (elapsed < 0) {
    return 0;
  }
  const double progress = timing.duration > 0 ? std::min(elapsed / timing.duration, 1.0) : 1.0;
  return getEasingFunctionFromConfig(timing.easing)(progress);
}

TransitionTiming
reverseTiming(const TransitionTiming &previous, double timestamp, double duration, double delay, EasingConfig easing) {
  // abs and clamp are the spec's guard for easings that overshoot [0, 1].
  const double factor = std::clamp(
      std::abs(easedProgressAt(previous, timestamp) * previous.reversingFactor + (1 - previous.reversingFactor)),
      0.0,
      1.0);
  duration *= factor;
  if (delay < 0) {
    delay *= factor;
  }
  return {factor, timestamp + delay, duration, delay, std::move(easing)};
}

} // namespace reanimated::css
