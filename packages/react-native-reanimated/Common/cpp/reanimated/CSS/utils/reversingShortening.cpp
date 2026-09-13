#include <reanimated/CSS/utils/reversingShortening.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::css {

ReversingState makeReversingState(double timestamp, double duration, double delay, EasingConfig easing) {
  return {1.0, timestamp + delay, duration, delay, std::move(easing)};
}

double easedProgressAt(const ReversingState &state, double timestamp) {
  if (timestamp < state.startTimestamp) {
    return 0;
  }
  const double linearProgress =
      state.duration > 0 ? std::clamp((timestamp - state.startTimestamp) / state.duration, 0.0, 1.0) : 1.0;
  return getEasingFunctionFromConfig(state.easing)(linearProgress);
}

ReversingState
reverseShorten(const ReversingState &previous, double timestamp, double duration, double delay, EasingConfig easing) {
  // The spec requires abs and clamp for overshooting easing curves.
  const double factor =
      std::clamp(std::abs(easedProgressAt(previous, timestamp) * previous.factor + (1 - previous.factor)), 0.0, 1.0);
  duration *= factor;
  if (delay < 0) {
    delay *= factor;
  }
  return {factor, timestamp + delay, duration, delay, std::move(easing)};
}

} // namespace reanimated::css
