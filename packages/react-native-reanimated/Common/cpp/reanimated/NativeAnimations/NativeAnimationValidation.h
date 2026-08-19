#pragma once

#include <reanimated/NativeAnimations/NativeAnimationInterfaces.h>
#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <optional>

namespace reanimated::native_animation {

// One aggregate budget for a whole plan: track count, keyframes, stored
// timing points, and encoded value cost in scalar components. The limits are
// provisional; the sampled-keyframe work (Objective 12) must measure and tune
// them.
struct NativeAnimationResourceBudget {
  // Layout plans use at most three tracks and CSS one; 32 leaves headroom.
  size_t maxTracksPerPlan{32};
  // A 60 Hz sample of a 60 s animation stays under it.
  size_t maxKeyframesPerPlan{4096};
  // Step and linear-stop curves store their points; this bound only stops
  // runaway input.
  size_t maxTimingPointsPerPlan{8192};
  // A full keyframe budget of matrix values (16 scalars each) plus one start
  // value for each track fits below it.
  size_t maxEncodedScalarsPerPlan{131072};
};

inline constexpr NativeAnimationResourceBudget kDefaultResourceBudget{};

// Running usage counters checked against one budget.
struct NativeAnimationResourceUsage {
  size_t tracks{0};
  size_t keyframes{0};
  size_t timingPoints{0};
  size_t encodedScalars{0};
};

// Encoded cost of one owned value in scalar components.
size_t encodedScalarCount(const AnimationValue &value);
// Stored timing points of one timing curve; parameterless curves cost zero.
size_t timingPointCount(const AnimationTiming &timing);
// Accumulates one track into `usage`; returns false when `budget` is exceeded.
bool accumulateTrackUsage(
    const AnimationTrack &track,
    const NativeAnimationResourceBudget &budget,
    NativeAnimationResourceUsage &usage);

// True when the platform track form can express this timing curve.
bool supportsTiming(const NativeTrackFormSupport &support, const AnimationTiming &timing);

TrackBuildResult buildAnimationTrack(AnimationTrack track);
std::optional<AnimationResultReason> validateAnimationPlan(const AnimationPlan &plan);

} // namespace reanimated::native_animation
