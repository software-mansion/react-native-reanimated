#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>
#include <reanimated/NativeAnimations/NativeAnimationTiming.h>
#include <reanimated/NativeAnimations/NativeAnimationValue.h>

#include <cstdint>
#include <optional>
#include <vector>

namespace reanimated::native_animation {

/// One endpoint after the start value. A segment whose end value equals the prior value is a hold.
struct AnimationSegment {
  double endOffset{1};
  AnimationValue endValue;
  AnimationTiming timingFromPrevious;
};

enum class EndpointPolicy : uint8_t {
  /// The mounted model already holds the end value. The host checks it and does not write it.
  MountedModelMustMatchEndpoint,
  /// The host writes the end value to the model before playback.
  ExecutorCommitsEndpoint,
  /// The host keeps the end value on screen after the timeline ends and does not write the model.
  /// The track stays an active target until its owner cancels it.
  HoldWithoutCommit,
};

/// Segment offsets increase strictly in (0, 1] and the last one is 1.
struct AnimationTrack {
  AnimationTarget target;
  AnimationStart start;
  std::vector<AnimationSegment> segments;
  double delayMs{0};
  double durationMs{0};
  EndpointPolicy endpointPolicy;
};

enum class TrackBuildFailure : uint8_t {
  UnsupportedTarget,
  UnsupportedValue,
  UnsupportedTiming,
  UnsupportedTrackForm,
  InvalidValue,
  /// The end value is not the value that the mounted model will hold.
  EndpointMismatch,
  ResourceLimit,
};

std::optional<TrackBuildFailure> validateTrack(const AnimationTrack &track);

enum class TrackPlayback : uint8_t {
  /// The value moves from the start value to the end value. With no duration the platform gives its
  /// default duration.
  Interpolated,
  /// The start value stays for the delay. Then the model value shows.
  HeldThroughDelay,
  /// No physical playback. The track ends inside the operation that admits it.
  Immediate,
};

/// A track with no duration has a playback of its own only when the mounted model holds its end value.
TrackPlayback playbackOf(const AnimationTrack &track);

} // namespace reanimated::native_animation
