#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>

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

ReversingState makeReversingState(double timestamp, double duration, double delay, EasingConfig easing);

// When a transition reverses an in-flight one, the new transition's duration
// (and negative delay) shorten by an accumulating factor based on how far the
// running transition had progressed.
// See https://drafts.csswg.org/css-transitions/#reversing
ReversingState
reverseShorten(const ReversingState &previous, double timestamp, double duration, double delay, EasingConfig easing);

} // namespace reanimated::css
