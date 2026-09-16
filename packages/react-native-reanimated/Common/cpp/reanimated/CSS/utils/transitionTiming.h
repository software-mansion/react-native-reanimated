#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::css {

/// One run of a transition: when it starts, how long it takes, its easing, and
/// the reversing shortening factor accumulated so far (1 until a reversal).
/// The easing stays a config so a run that never reverses never resolves it.
struct TransitionTiming {
  double reversingFactor;
  double startTimestamp;
  double duration;
  double delay;
  EasingConfig easing;
};

inline TransitionTiming
makeTiming(const double timestamp, const double duration, const double delay, EasingConfig easing) {
  return {1.0, timestamp + delay, duration, delay, std::move(easing)};
}

/// The easing output at `timestamp`. 0 while the run is still delayed: steps and
/// linear() stops can map progress 0 above 0, but nothing has played yet.
inline double easedProgressAt(const TransitionTiming &timing, const double timestamp) {
  const double elapsed = timestamp - timing.startTimestamp;
  if (elapsed < 0) {
    return 0;
  }
  const double progress = timing.duration > 0 ? std::min(elapsed / timing.duration, 1.0) : 1.0;
  return getEasingFunctionFromConfig(timing.easing)(progress);
}

/// The run that reverses `previous` mid-flight, shortened by how far `previous`
/// got: https://drafts.csswg.org/css-transitions/#reversing
inline TransitionTiming reverseTiming(
    const TransitionTiming &previous,
    const double timestamp,
    double duration,
    double delay,
    EasingConfig easing) {
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
