#include <reanimated/CSS/utils/transitionTimeline.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::css {

TransitionTimeline makeTimeline(double timestamp, double duration, double delay, EasingConfig easing) {
  return {1.0, timestamp + delay, duration, delay, std::move(easing)};
}

TransitionTimeline reverseTimeline(
    const TransitionTimeline &previous,
    double timestamp,
    double duration,
    double delay,
    EasingConfig easing) {
  const double elapsed = std::clamp(timestamp - previous.startTimestamp, 0.0, previous.duration);
  const double linearProgress = previous.duration > 0 ? elapsed / previous.duration : 1.0;
  const double easedProgress = getEasingFunctionFromConfig(previous.easing)(linearProgress);
  // abs and clamp are the spec's guard for easings that overshoot [0, 1].
  const double factor =
      std::clamp(std::abs(easedProgress * previous.reversingFactor + (1 - previous.reversingFactor)), 0.0, 1.0);
  duration *= factor;
  if (delay < 0) {
    delay *= factor;
  }
  return {factor, timestamp + delay, duration, delay, std::move(easing)};
}

} // namespace reanimated::css
