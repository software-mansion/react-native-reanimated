#pragma once

#include <reanimated/NativeAnimations/NativeAnimationRequest.h>

#include <react/renderer/mounting/ShadowView.h>

#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <variant>
#include <vector>

namespace reanimated::native_animation {

enum class TrackStopMode : uint8_t {
  /// The view shows its model value again.
  SettleToModel,
  /// The value on screen stays: the platform writes it to the model.
  KeepVisibleValue,
};

/// A command resolved against its mounted view. The platform creates it and is the only user of its state.
/// It lives inside one host operation and can refer to the request of that operation.
class MountedAnimation {
 public:
  virtual ~MountedAnimation() = default;

  /// Reads the start values. `interruptedTargets` are the request targets that replace an active track.
  /// Changes no model value and no playback.
  virtual std::optional<AnimationResultReason> prepare(const std::vector<AnimationTarget> &interruptedTargets) = 0;

  /// Cannot fail. Removes `replacedTracks` and starts playback in one platform transaction.
  virtual void start(const std::vector<TrackKey> &replacedTracks) = 0;
};

/// The reason is why the platform rejects the command.
using MountedAnimationResolution = std::variant<std::unique_ptr<MountedAnimation>, AnimationResultReason>;

#ifndef NDEBUG
/// One physical animation of the playback of a target.
struct PlaybackMember {
  /// The platform name of what the member animates.
  std::string property;
  /// The components of the value at the start and at the end of each segment.
  std::vector<std::vector<double>> values;
  /// The time of each value as a part of the duration of the member.
  std::vector<double> keyTimes;
};

/// The components of the model value and of the value on screen. For a transform they are the 16 cells of
/// the matrix, and the value on screen is valid only for a playback of one operation.
struct TargetSample {
  std::vector<double> model;
  std::vector<double> presentation;
  /// The platform keys of each physical playback that the platform put on the view, for all targets.
  std::vector<std::string> playbackKeys;
  /// The members of the playback of the target, in the order in which the platform applies them.
  std::vector<PlaybackMember> members;
  /// The view is allowed to antialias its edges.
  bool edgeAntialiasing{false};
  /// On the clock of the trace events. The host sets it.
  double monotonicTimeMs{0};
};
#endif

/// The platform part of the host. All calls but `canRealize` are on the platform UI thread.
class NativeAnimationPlatform {
 public:
  using TrackEndListener = std::function<void(const TrackKey &track, bool finished)>;

  virtual ~NativeAnimationPlatform() = default;

  virtual void setTrackEndListener(TrackEndListener listener) = 0;

  /// False when the component and the props of `view` show that the platform cannot play the track on the
  /// host view. Reads no mounted state, so a client can ask before the mount.
  virtual bool canRealize(const AnimationTrack &track, const facebook::react::ShadowView &view) = 0;

  virtual bool isSurfaceRunning(SurfaceId surfaceId) = 0;
  /// True when the mounted view of the tag is in a window.
  virtual bool isInWindow(Tag tag) = 0;
  /// Finds the mounted view, converts the tracks, and checks the model endpoints. Changes no state and reads
  /// no surface state.
  virtual MountedAnimationResolution resolve(const AnimationRequest &request) = 0;

  /// Removes the physical track. The track end listener does not report a stopped track; each report with
  /// `finished == false` is thus a removal that the host did not ask for.
  virtual void stop(const TrackKey &track, TrackStopMode mode) = 0;

  /// Runs `operation` on the UI thread later, also when the caller is on that thread. The caller can
  /// thus hold a lock that the operation or a client callback takes.
  virtual void postToUIThread(std::function<void()> operation) = 0;

#ifndef NDEBUG
  virtual std::optional<TargetSample> sample(Tag tag, AnimationTarget target) = 0;
#endif
};

} // namespace reanimated::native_animation
