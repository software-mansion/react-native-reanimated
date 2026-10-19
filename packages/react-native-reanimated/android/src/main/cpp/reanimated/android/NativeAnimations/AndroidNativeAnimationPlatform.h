#pragma once

#include <reanimated/NativeAnimations/NativeAnimationPlatform.h>
#include <reanimated/android/NativeAnimations/JNativeAnimationExecutor.h>

#include <fbjni/fbjni.h>

#include <array>
#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>

namespace facebook::react {
class UIManager;
} // namespace facebook::react

namespace reanimated::native_animation {

/// A `TimeInterpolator` of the executor plays each timing kind.
inline constexpr std::array kAnimatorTimingKinds{
    AnimationTimingKind::Linear,
    AnimationTimingKind::CubicBezier,
    AnimationTimingKind::Steps,
    AnimationTimingKind::LinearStops};

/// Plays each track with one `ValueAnimator` of the Kotlin `NativeAnimationExecutor`, which writes the view
/// property that React Native writes.
class AndroidNativeAnimationPlatform final : public NativeAnimationPlatform,
                                             public std::enable_shared_from_this<AndroidNativeAnimationPlatform> {
 public:
  using GetAnimationTimestampFunction = std::function<double()>;

  /// JS thread, before the first host operation.
  static std::shared_ptr<AndroidNativeAnimationPlatform> create(
      alias_ref<JNativeAnimationExecutor::javaobject> executor,
      std::weak_ptr<const facebook::react::UIManager> uiManager,
      GetAnimationTimestampFunction getAnimationTimestamp);

  int apiLevel() const;
  /// Any thread.
  bool animatorsEnabled() const;
  /// Any thread. Drops the posted operations. Later posts and executor reports do nothing.
  void close();

  void setTrackEndListener(TrackEndListener listener) override;
  bool canRealize(const AnimationTrack &track, const facebook::react::ShadowView &view) override;
  bool isSurfaceRunning(SurfaceId surfaceId) override;
  bool isInWindow(Tag tag) override;
  MountedAnimationResolution resolve(const AnimationRequest &request) override;
  void stop(const TrackKey &track, TrackStopMode mode) override;
  void postToUIThread(std::function<void()> operation) override;
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  std::optional<TargetSample> sample(Tag tag, AnimationTarget target) override;
#endif

 private:
  using Operation = std::function<void()>;

  AndroidNativeAnimationPlatform(
      alias_ref<JNativeAnimationExecutor::javaobject> executor,
      std::weak_ptr<const facebook::react::UIManager> uiManager,
      GetAnimationTimestampFunction getAnimationTimestamp);

  bool plays(const AnimationTrack &track) const;
  bool hasWriter(AnimationTarget target) const;
  void onTrackEnded(const TrackKey &track, bool finished);
  /// One platform pass: all operations of the pass read one time.
  void drainPostedOperations();

  const global_ref<JNativeAnimationExecutor::javaobject> executor_;
  const std::weak_ptr<const facebook::react::UIManager> uiManager_;
  const GetAnimationTimestampFunction getAnimationTimestamp_;
  const int apiLevel_;
  TrackEndListener trackEndListener_;
  /// Set for the time of a platform pass. UI thread only.
  std::optional<double> passTimestampMs_;

  std::mutex operationsMutex_;
  std::deque<Operation> postedOperations_;
  bool isClosed_{false};
};

} // namespace reanimated::native_animation
