#pragma once

#include <jsi/jsi.h>
#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/uimanager/UIManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <worklets/Tools/UIScheduler.h>

#include <memory>
#include <optional>
#include <unordered_map>
#include <vector>

namespace reanimated {

struct LayoutAnimation {
  ShadowView finalView, currentView, startView;
  Tag parentTag;
  std::optional<double> opacity;
  bool isViewAlreadyMounted = false;
  int count = 1;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;
};

class LayoutAnimationsProxyCommon : public facebook::react::MountingOverrideDelegate {
 public:
  LayoutAnimationsProxyCommon(
      std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager,
      SharedComponentDescriptorRegistry componentDescriptorRegistry,
      std::shared_ptr<const ContextContainer> contextContainer,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<UIScheduler> uiScheduler
#ifdef ANDROID
      ,
      PreserveMountedTagsFunction filterUnmountedTagsFunction,
      std::shared_ptr<facebook::react::UIManager> uiManager,
      std::shared_ptr<facebook::react::CallInvoker> jsInvoker
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
  mutable std::vector<Tag> finishedAnimationTags_;
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

#endif
};

} // namespace reanimated
