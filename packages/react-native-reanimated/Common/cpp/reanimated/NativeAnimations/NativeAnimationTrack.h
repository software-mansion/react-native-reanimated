#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>
#include <reanimated/NativeAnimations/NativeAnimationTiming.h>
#include <reanimated/NativeAnimations/NativeAnimationValue.h>

#include <cstdint>
#include <optional>
#include <variant>
#include <vector>

namespace reanimated::native_animation {

/// One endpoint after the start value of a timeline. A segment whose end value equals the prior value is a hold.
template <typename Value>
struct TimelineSegment {
  double endOffset{1};
  Value endValue;
  AnimationTiming timingFromPrevious;
};

using AnimationSegment = TimelineSegment<AnimationValue>;

/// The timeline of a target whose value has one form.
struct ValueTimeline {
  AnimationStart start;
  std::vector<AnimationSegment> segments;
};

/// The timeline of one operation of a transform. Its offsets are in the time of its track.
struct OperationTimeline {
  TransformOperationKind kind;
  double start{0};
  std::vector<TimelineSegment<double>> segments;
};

/// The operations of a style transform in the order of its array. Each operation moves on its own scalar and
/// its own timeline, so the path of the matrix is the product of the operations at each time.
struct TransformTimelines {
  std::vector<OperationTimeline> operations;
};

using TrackBody = std::variant<ValueTimeline, TransformTimelines>;

enum class EndpointPolicy : uint8_t {
  /// The mounted model already holds the end value. The host checks it and does not write it.
  MountedModelMustMatchEndpoint,
  /// The host writes the end value to the model before playback.
  ExecutorCommitsEndpoint,
  /// The host keeps the end value on screen after the timeline ends and does not write the model.
  /// The track stays an active target until its owner cancels it.
  HoldWithoutCommit,
};

/// The segment offsets of each timeline increase strictly in (0, 1] and the last one is 1. A `Transform` track
/// has a transform body with one value for each perspective: the value on screen of a transform has no
/// operation list. Each other track has a value body.
struct AnimationTrack {
  AnimationTarget target;
  TrackBody body;
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
  /// The animation continues an active one in a way that only its owner can repeat.
  UnsupportedContinuation,
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

/// False when the track has an explicit start value and each segment ends at that value.
bool changesValue(const AnimationTrack &track);

struct TransformEndpoints {
  AnimationTransform start;
  AnimationTransform end;
};

/// The operations of a valid transform body at the start and at the end of its track.
TransformEndpoints endpointsOf(const TransformTimelines &body);

/// A track with no duration has a playback of its own only when the mounted model holds its end value.
TrackPlayback playbackOf(const AnimationTrack &track);

} // namespace reanimated::native_animation
