#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/uimanager/UIManager.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/FrameDrivenAnimationLease.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutMountBoundary.h>
#include <reanimated/LayoutAnimations/LayoutNativeAnimationAdapter.h>
#include <reanimated/LayoutAnimations/PendingNativeLayoutStarts.h>
#include <reanimated/NativeAnimations/NativeAnimationService.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <mutex>
#include <optional>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

constexpr bool useNativeLayoutAnimations() {
#ifdef __APPLE__
  return StaticFeatureFlags::getFlag("IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION");
#else
  return false;
#endif
}

struct LayoutAnimation {
  ShadowView finalView, currentView, startView;
  Tag parentTag;
  std::optional<double> opacity;
  bool isViewAlreadyMounted = false;
  int count = 1;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;

  bool isSettled() const {
    return count == 0;
  }
};

#ifdef ANDROID
// Bookkeeping for animation starts that were scheduled onto the UI thread but
// haven't run yet — see `pendingStarts_` below.
struct PendingStart {
  int count = 0;
  uint64_t handle = 0;
};

// Removes one pending start for the given tag and returns whether it was
// cancelled since it was scheduled (i.e. its handle is no longer current).
// Call under the proxy mutex.
inline bool
consumeIsCancelled(std::unordered_map<Tag, PendingStart> &pendingStarts, const Tag tag, const uint64_t handle) {
  const auto it = pendingStarts.find(tag);
  // every scheduled start keeps its entry alive until it is consumed —
  // cancellations only bump the handle, they never erase
  react_native_assert(it != pendingStarts.end() && "PendingStart not found");
  const bool isCancelled = it->second.handle != handle;
  if (--it->second.count == 0) {
    pendingStarts.erase(it);
  }
  return isCancelled;
}
#endif

class LayoutAnimationsProxyCommon : public facebook::react::MountingOverrideDelegate {
 public:
  LayoutAnimationsProxyCommon(
      const std::shared_ptr<LayoutAnimationsManager> &layoutAnimationsManager,
      const SharedComponentDescriptorRegistry &componentDescriptorRegistry,
      const std::shared_ptr<const ContextContainer> &contextContainer,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<native_animation::NativeAnimationService> &nativeAnimationService,
      const std::shared_ptr<LayoutMountBoundary> &layoutMountBoundary,
      const std::shared_ptr<facebook::react::UIManager> &uiManager
#ifdef ANDROID
      ,
      const PreserveMountedTagsFunction &filterUnmountedTagsFunction,
      const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker
#endif
      )
      : layoutAnimationsManager_(layoutAnimationsManager),
        contextContainer_(contextContainer),
        componentDescriptorRegistry_(componentDescriptorRegistry),
        uiRuntime_(uiRuntime),
        uiScheduler_(uiScheduler),
        uiManager_(uiManager),
        nativeAnimationAdapter_(
            useNativeLayoutAnimations() && nativeAnimationService
                ? std::make_shared<LayoutNativeAnimationAdapter>(
                      nativeAnimationService,
                      [uiScheduler](const native_animation::CallbackOperation &operation) {
                        scheduleOnUI(uiScheduler, operation);
                      })
                : nullptr),
        pendingNativeStarts_(makePendingNativeLayoutStarts(nativeAnimationService, layoutMountBoundary))
#ifdef ANDROID
        ,
        preserveMountedTags_(filterUnmountedTagsFunction),
        jsInvoker_(jsInvoker)
#endif
  {
  }
  virtual std::optional<facebook::react::SurfaceId>
  onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward);
  virtual std::optional<facebook::react::SurfaceId> onGestureCancel();
  virtual std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle) = 0;
  virtual std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) = 0;
  virtual void startSurface(const SurfaceId surfaceId);

  // `onGranted` must capture the proxy weakly and lock it again. A strong
  // capture would keep the proxy alive while the claim is pending and would
  // make the expired-owner release path in the grant callback unreachable.
  void claimFrameDrivenLayoutAnimation(
      SurfaceId surfaceId,
      Tag tag,
      LayoutAnimationType type,
      const std::weak_ptr<const LayoutAnimationsProxyCommon> &weakOwner,
      std::function<void()> onGranted) const;
  void releaseFrameDrivenLayoutAnimation(SurfaceId surfaceId, Tag tag, native_animation::AnimationOutcome outcome)
      const;

  // Final-state-first delivery: stores an owned prepared request during
  // interception; the pending store submits it after the intended mount.
  void enqueueNativeLayoutStart(
      LayoutAnimationType type,
      const ShadowView &oldView,
      const ShadowView &finalView,
      MountingTransaction::Number transactionNumber,
      native_animation::AnimationRequest request,
      native_animation::AnimationCallbacks callbacks) const;
  void cancelNativeLayoutStart(const native_animation::AnimationHandle &handle) const;
  void notifyNativeStartsSurfaceStarted(SurfaceId surfaceId) const;
  void cancelNativeStartsSurface(SurfaceId surfaceId) const;

 protected:
  static std::shared_ptr<PendingNativeLayoutStarts> makePendingNativeLayoutStarts(
      const std::shared_ptr<native_animation::NativeAnimationService> &nativeAnimationService,
      const std::shared_ptr<LayoutMountBoundary> &layoutMountBoundary);

  void transferConfigFromNativeID(const std::string &nativeId, const int tag) const;

  mutable std::unordered_set<Tag> maybeSettledAnimationTags_;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  std::shared_ptr<const ContextContainer> contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  jsi::Runtime &uiRuntime_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  std::shared_ptr<facebook::react::UIManager> uiManager_;
  const std::shared_ptr<LayoutNativeAnimationAdapter> nativeAnimationAdapter_;
  const std::shared_ptr<PendingNativeLayoutStarts> pendingNativeStarts_;
  PreserveMountedTagsFunction preserveMountedTags_;

  struct FrameDrivenLeaseKey {
    SurfaceId surfaceId;
    Tag tag;

    bool operator==(const FrameDrivenLeaseKey &) const = default;
  };

  struct FrameDrivenLeaseKeyHash {
    size_t operator()(const FrameDrivenLeaseKey &key) const noexcept;
  };

  // Every access to this map runs on the platform main thread today: the
  // grant, terminal, progress, end, and cancel paths all reach it there, and
  // Android compiles the native route out. Guard it with a mutex before any
  // of those paths can run on another thread.
  mutable std::unordered_map<FrameDrivenLeaseKey, std::shared_ptr<FrameDrivenAnimationLease>, FrameDrivenLeaseKeyHash>
      frameDrivenLeases_;
  mutable uint64_t frameDrivenGeneration_{0};
  // Entering claims that the coordinator rejected. The claim resolves inline
  // on iOS, so the mount code consumes the tag in the same transaction and
  // keeps the view visible instead of mounting it with zero opacity.
  mutable std::unordered_set<Tag> rejectedEnteringClaimTags_;

  void handleRejectedFrameDrivenLayoutAnimation(
      Tag tag,
      LayoutAnimationType type,
      native_animation::AnimationResultReason reason) const;
  bool consumeRejectedEnteringClaim(Tag tag) const;
  std::optional<FrameDrivenAnimationLeaseWriteGuard> lockFrameDrivenLayoutAnimation(SurfaceId surfaceId, Tag tag) const;

#ifdef ANDROID
  std::shared_ptr<facebook::react::CallInvoker> jsInvoker_;

  void restoreOpacityInCaseOfFlakyEnteringAnimation(SurfaceId surfaceId) const;

  // On Android pullTransaction can run on the JS thread, so animation starts
  // are scheduled onto the UI thread. If `maybeCancelAnimation` is called between the
  // start was scheduled and the lambda runs, it
  // finds no `layoutAnimations_` entry to erase (the start lambda hasn't created it
  // yet) and the cancellation is lost — the stale start would later
  // "resurrect" the animation for a view whose Remove+Delete are already on
  // their way to the mounting layer
  // (https://github.com/software-mansion/react-native-reanimated/issues/7493).

  // To work around this, we keep a separate `pendingStarts_` map that tracks scheduled starts by tag,
  //  with a generation counter to detect cancellations.
  mutable std::unordered_map<Tag, PendingStart> pendingStarts_;
#endif
};

} // namespace reanimated
