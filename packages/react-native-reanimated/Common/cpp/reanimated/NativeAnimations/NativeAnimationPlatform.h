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

/// The reason is why the platform rejects the command.
using MountedAnimationResolution = std::variant<std::unique_ptr<MountedAnimation>, AnimationResultReason>;

#ifndef NDEBUG
/// The components of the model value and of the value on screen.
struct TargetSample {
  std::vector<double> model;
  std::vector<double> presentation;
  /// On the clock of the trace events. The host sets it.
  double monotonicTimeMs{0};
};
#endif

/// The platform part of the host. All calls are on the platform UI thread.
class NativeAnimationPlatform {
 public:
  using TrackEndListener = std::function<void(const TrackKey &track, bool finished)>;

  virtual ~NativeAnimationPlatform() = default;

  virtual void setTrackEndListener(TrackEndListener listener) = 0;

  virtual bool isSurfaceRunning(SurfaceId surfaceId) = 0;
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
  /// The receiver gets the sample at the next display frame.
  virtual void
  sampleAtNextFrame(Tag tag, AnimationTarget target, std::function<void(std::optional<TargetSample>)> receiver) = 0;
#endif
};

} // namespace reanimated::native_animation
