#include <reanimated/CSS/utils/reversingShortening.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::css {

ReversingState makeReversingState(double timestamp, double duration, double delay, EasingConfig easing) {
  return {1.0, timestamp + delay, duration, delay, std::move(easing)};
}

ReversingState
reverseShorten(const ReversingState &previous, double timestamp, double duration, double delay, EasingConfig easing) {
  const double elapsed = std::clamp(timestamp - previous.startTimestamp, 0.0, previous.duration);
  const double linearProgress = previous.duration > 0 ? elapsed / previous.duration : 1.0;
  const double easedProgress = getEasingFunctionFromConfig(previous.easing)(linearProgress);
  // The spec requires abs and clamp for overshooting easing curves.
  const double factor = std::clamp(std::abs(easedProgress * previous.factor + (1 - previous.factor)), 0.0, 1.0);
  duration *= factor;
  if (delay < 0) {
    delay *= factor;
  }
  return {factor, timestamp + delay, duration, delay, std::move(easing)};
}

} // namespace reanimated::css
