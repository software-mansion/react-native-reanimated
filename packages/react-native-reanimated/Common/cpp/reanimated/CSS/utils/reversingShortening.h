#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>

#include <algorithm>
#include <utility>

namespace reanimated::css {

// Snapshot of a transition's reversing-shortening state. Stores the easing as
// a config (variant), not a resolved EasingFunction - the function is only
// rebuilt inside reverseShorten when an actual reversal happens, so a
// transition that never gets reversed never pays for the resolution.
struct ReversingState {
  double factor;
  double startTimestamp;
  double duration;
  double delay;
  EasingConfig easing;
};

inline ReversingState makeReversingState(double timestamp, double duration, double delay, EasingConfig easing) {
  return {1.0, timestamp + delay, duration, delay, std::move(easing)};
}

// When a transition reverses an in-flight one, the new transition's duration
// (and negative delay) shorten by an accumulating factor based on how far the
// running transition had progressed.
// See https://drafts.csswg.org/css-transitions/#reversing
inline ReversingState
reverseShorten(const ReversingState &previous, double timestamp, double duration, double delay, EasingConfig easing) {
  const double elapsed = std::clamp(timestamp - previous.startTimestamp, 0.0, previous.duration);
  const double linearProgress = previous.duration > 0 ? elapsed / previous.duration : 1.0;
  const double easedProgress = getEasingFunctionFromConfig(previous.easing)(linearProgress);
  const double factor = easedProgress * previous.factor + (1 - previous.factor);
  duration *= factor;
  if (delay < 0) {
    delay *= factor;
  }
  return {factor, timestamp + delay, duration, delay, std::move(easing)};
}

} // namespace reanimated::css
