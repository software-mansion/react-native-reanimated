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

/// Linear progress of the transition described by `state` at `timestamp`,
/// clamped to [0, 1].
inline double linearProgressAt(const ReversingState &state, double timestamp) {
  const double elapsed = std::clamp(timestamp - state.startTimestamp, 0.0, state.duration);
  return state.duration > 0 ? elapsed / state.duration : 1.0;
}

/// Eased progress of the transition described by `state` at `timestamp`.
/// Resolves the easing function on every call - use only on transition
/// retargets, not per frame.
inline double easedProgressAt(const ReversingState &state, double timestamp) {
  return getEasingFunctionFromConfig(state.easing)(linearProgressAt(state, timestamp));
}

// When a transition reverses an in-flight one, the new transition's duration
// (and negative delay) shorten by an accumulating factor based on how far the
// running transition had progressed.
// See https://drafts.csswg.org/css-transitions/#reversing
inline ReversingState
reverseShorten(const ReversingState &previous, double timestamp, double duration, double delay, EasingConfig easing) {
  const double easedProgress = easedProgressAt(previous, timestamp);
  const double factor = easedProgress * previous.factor + (1 - previous.factor);
  duration *= factor;
  if (delay < 0) {
    delay *= factor;
  }
  return {factor, timestamp + delay, duration, delay, std::move(easing)};
}

} // namespace reanimated::css
