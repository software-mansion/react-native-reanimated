#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTrack.h>

#include <cstdint>
#include <vector>

namespace reanimated::native_animation {

/// Owns all of its data. It holds no JSI value and no platform object.
struct AnimationRequest {
  AnimationHandle handle;
  /// The time at which the tracks start, on the Reanimated animation clock. It can lie in the past.
  double originTimestampMs;
  std::vector<AnimationTrack> tracks;
};

enum class AnimationOutcome : uint8_t {
  Finished,
  Cancelled,
  Interrupted,
  Rejected,
  SurfaceDestroyed,
};

enum class AnimationResultReason : uint8_t {
  None,
  InvalidPlan,
  StaleIdentity,
  TargetUnavailable,
  UnsupportedRealization,
  CurrentValueUnavailable,
  EndpointMismatch,
  OwnershipDenied,
  /// The platform removed the playback and the host did not ask for it.
  PlatformRemoved,
};

struct AnimationResult {
  AnimationOutcome outcome;
  AnimationResultReason reason{AnimationResultReason::None};
};

/// A domain that starts commands. The host calls it on the platform UI thread after its own state change.
class NativeAnimationClient {
 public:
  virtual ~NativeAnimationClient() = default;

  /// Native playback started.
  virtual void onAnimationAdmitted(const AnimationHandle &handle) = 0;
  /// A physical track left the screen or, for HoldWithoutCommit, reached the end of its timeline.
  /// Tracks that outlive the result of their command still report here.
  virtual void onTrackEnded(const TrackKey &track, bool finished) = 0;
  /// The one terminal result of a command. Rejected, and SurfaceDestroyed for a surface that does not
  /// run, mean that native playback did not start.
  virtual void onAnimationEnded(const AnimationHandle &handle, AnimationResult result) = 0;
};

} // namespace reanimated::native_animation
