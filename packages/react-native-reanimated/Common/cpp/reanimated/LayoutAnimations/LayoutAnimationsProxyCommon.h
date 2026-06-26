#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/uimanager/UIManager.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <optional>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

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
      const std::shared_ptr<UIScheduler> &uiScheduler
#ifdef ANDROID
      ,
      const PreserveMountedTagsFunction &filterUnmountedTagsFunction,
      const std::shared_ptr<facebook::react::UIManager> &uiManager,
      const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker
#endif
      )
      : layoutAnimationsManager_(layoutAnimationsManager),
        contextContainer_(contextContainer),
        componentDescriptorRegistry_(componentDescriptorRegistry),
        uiRuntime_(uiRuntime),
        uiScheduler_(uiScheduler)
#ifdef ANDROID
        ,
        preserveMountedTags_(filterUnmountedTagsFunction),
        uiManager_(uiManager),
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

 protected:
  mutable std::unordered_set<Tag> maybeSettledAnimationTags_;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  std::shared_ptr<const ContextContainer> contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  jsi::Runtime &uiRuntime_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  PreserveMountedTagsFunction preserveMountedTags_;

#ifdef ANDROID
  std::shared_ptr<facebook::react::UIManager> uiManager_;
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
