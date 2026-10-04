#pragma once

#include <reanimated/NativeAnimations/NativeAnimationRequest.h>

#include <functional>
#include <memory>
#include <optional>
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

/// The result is the reason why the command cannot start: SurfaceDestroyed when its surface does not run,
/// else Rejected.
using MountedAnimationResolution = std::variant<std::unique_ptr<MountedAnimation>, AnimationResult>;

/// The platform part of the host. All calls are on the platform UI thread.
class NativeAnimationPlatform {
 public:
  using TrackEndListener = std::function<void(const TrackKey &track, bool finished)>;

  virtual ~NativeAnimationPlatform() = default;

  virtual void setTrackEndListener(TrackEndListener listener) = 0;

  /// Finds the mounted view, converts the tracks, and checks the model endpoints. Changes no state.
  virtual MountedAnimationResolution resolve(const AnimationRequest &request) = 0;

  /// Removes the physical track. The track end listener does not report a stopped track; each report with
  /// `finished == false` is thus a removal that the host did not ask for.
  virtual void stop(const TrackKey &track, TrackStopMode mode) = 0;

  /// Runs `operation` on the UI thread later, also when the caller is on that thread. The caller can
  /// thus hold a lock that the operation or a client callback takes.
  virtual void postToUIThread(std::function<void()> operation) = 0;
};

} // namespace reanimated::native_animation
