#pragma once

#include <reanimated/NativeAnimations/NativeAnimationPlatform.h>
#include <reanimated/android/NativeAnimations/JNativeAnimationExecutor.h>

#include <fbjni/fbjni.h>

#include <array>
#include <cstdint>
#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <vector>

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
/// property that React Native writes, or the animation matrix of the view for position and transform tracks.
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
  /// The Fabric mount listener: a dispatch of mount items begins. UI thread only.
  void willMountItems();
  /// The Fabric mount listener: the mount items of the dispatch ran. Runs `report` with the number of the
  /// dispatch in one platform pass. UI thread only.
  void didMountItems(const std::function<void(std::uint64_t dispatch)> &report);

  void setTrackEndListener(TrackEndListener listener) override;
  bool canRealize(const AnimationTrack &track, const facebook::react::ShadowView &view) override;
  bool isSurfaceRunning(SurfaceId surfaceId) override;
  bool isInWindow(SurfaceId surfaceId, Tag tag) override;
  /// The number of the dispatch that runs now: its `didMountItems` reports the pull.
  std::optional<std::uint64_t> mountReportOfPull(SurfaceId surfaceId) override;
  MountedAnimationResolution resolve(const AnimationRequest &request) override;
  void modelDidChange(const TrackKey &track, double value) override;
  void stop(const TrackKey &track, TrackStopMode mode) override;
  void postToUIThread(std::function<void()> operation) override;
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  std::optional<TargetSample> sample(Tag tag, AnimationTarget target) override;
  /// The next view lookup of `resolve` for the tag finds no view. UI thread only.
  void failNextViewLookup(Tag tag);
  /// The playbacks on the view at the failed lookup, five values for each (surface, tag, owner, generation,
  /// target). Null when the lookup did not fail since the last call. UI thread only.
  local_ref<JArrayLong> takeViewLookupFailure();
#endif

 private:
  using Operation = std::function<void()>;

  AndroidNativeAnimationPlatform(
      alias_ref<JNativeAnimationExecutor::javaobject> executor,
      std::weak_ptr<const facebook::react::UIManager> uiManager,
      GetAnimationTimestampFunction getAnimationTimestamp);

  /// The rules that the track alone decides. `resolve` has no shadow view, so `canRealize` adds the rules of
  /// the final view.
  bool plays(const AnimationTrack &track) const;
  bool playsTarget(const AnimationTrack &track) const;
  bool modelEndsAt(alias_ref<JView> view, const AnimationTrack &track) const;
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
  std::uint64_t dispatchCounter_{0};
  /// From `willMountItems` to the end of the pass of `didMountItems`. UI thread only.
  std::optional<std::uint64_t> currentDispatch_;
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  std::optional<Tag> failingViewLookup_;
  std::optional<std::vector<TrackKey>> viewLookupFailure_;
#endif

  std::mutex operationsMutex_;
  std::deque<Operation> postedOperations_;
  bool isClosed_{false};
};

} // namespace reanimated::native_animation
