#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>

namespace reanimated::css {

/// One run of a transition: when it starts, how long it takes, its easing, and
/// the reversing shortening factor accumulated so far (1 until a reversal).
/// The easing stays a config so a run that never reverses never resolves it.
struct TransitionTimeline {
  double reversingFactor;
  double startTimestamp;
  double duration;
  double delay;
  EasingConfig easing;
};

TransitionTimeline makeTimeline(double timestamp, double duration, double delay, EasingConfig easing);

/// The run that reverses `previous` mid-flight, shortened by how far `previous`
/// got: https://drafts.csswg.org/css-transitions/#reversing
TransitionTimeline reverseTimeline(
    const TransitionTimeline &previous,
    double timestamp,
    double duration,
    double delay,
    EasingConfig easing);

} // namespace reanimated::css
