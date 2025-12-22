#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/Tools/UIScheduler.h>

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerAnimationDelegate.h>
#include <react/renderer/uimanager/UIManagerBinding.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

class ReanimatedModuleProxy;

using namespace facebook;

struct LayoutAnimation {
#if REACT_NATIVE_MINOR_VERSION >= 78
  std::shared_ptr<ShadowView> finalView, currentView;
  Tag parentTag;
#else
  std::shared_ptr<ShadowView> finalView, currentView, parentView;
#endif // REACT_NATIVE_MINOR_VERSION >= 78
  std::optional<double> opacity;
  bool isViewAlreadyMounted = false;
  int count = 1;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;
};

struct SurfaceContext {
  mutable std::unordered_set<std::shared_ptr<MutationNode>> deadNodes;
};

struct LayoutAnimationsProxy
    : public MountingOverrideDelegate,
      public UIManagerAnimationDelegate,
      public std::enable_shared_from_this<LayoutAnimationsProxy> {
  mutable std::unordered_map<Tag, std::shared_ptr<Node>> nodeForTag_;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  mutable std::recursive_mutex mutex;
  mutable SurfaceManager surfaceManager;
  mutable std::unordered_map<SurfaceId, SurfaceContext> surfaceContext_;
  mutable std::unordered_map<Tag, int> leastRemoved;
  mutable std::unordered_set<SurfaceId> surfacesToRemove_;
  mutable std::vector<Tag> finishedAnimationTags_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  ContextContainer::Shared contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  jsi::Runtime &uiRuntime_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
#ifdef ANDROID
  PreserveMountedTagsFunction preserveMountedTags_;
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<CallInvoker> jsInvoker_;
#endif

  LayoutAnimationsProxy(
      std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager,
      SharedComponentDescriptorRegistry componentDescriptorRegistry,
      ContextContainer::Shared contextContainer,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<UIScheduler> uiScheduler
#ifdef ANDROID
      ,
      PreserveMountedTagsFunction filterUnmountedTagsFunction,
      std::shared_ptr<UIManager> uiManager,
      std::shared_ptr<CallInvoker> jsInvoker
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
#endif // ANDROID
  {
  }

  void startEnteringAnimation(const int tag, ShadowViewMutation &mutation)
      const;
  void startExitingAnimation(const int tag, ShadowViewMutation &mutation) const;
  void startLayoutAnimation(const int tag, const ShadowViewMutation &mutation)
      const;

  void transferConfigFromNativeID(const std::string nativeId, const int tag)
      const;
  std::optional<SurfaceId> progressLayoutAnimation(
      int tag,
      const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
  void maybeCancelAnimation(const int tag) const;

  void parseRemoveMutations(
      std::unordered_map<Tag, Tag> &movedViews,
      ShadowViewMutationList &mutations,
      std::vector<std::shared_ptr<MutationNode>> &roots) const;
  void handleRemovals(
      ShadowViewMutationList &filteredMutations,
      std::vector<std::shared_ptr<MutationNode>> &roots,
      std::unordered_set<std::shared_ptr<MutationNode>> &deadNodes,
      bool shouldAnimate) const;

  void handleUpdatesAndEnterings(
      ShadowViewMutationList &filteredMutations,
      const std::unordered_map<Tag, Tag> &movedViews,
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;
  void addOngoingAnimations(
      SurfaceId surfaceId,
      ShadowViewMutationList &mutations) const;
  void updateOngoingAnimationTarget(
      const int tag,
      const ShadowViewMutation &mutation) const;
  std::shared_ptr<ShadowView> cloneViewWithoutOpacity(
      facebook::react::ShadowViewMutation &mutation,
      const PropsParserContext &propsParserContext) const;
  void maybeRestoreOpacity(
      LayoutAnimation &layoutAnimation,
      const jsi::Object &newStyle) const;
  void maybeUpdateWindowDimensions(
      facebook::react::ShadowViewMutation &mutation,
      SurfaceId surfaceId) const;
  void createLayoutAnimation(
      const ShadowViewMutation &mutation,
      ShadowView &oldView,
      const SurfaceId &surfaceId,
      const int tag) const;

  void updateIndexForMutation(ShadowViewMutation &mutation) const;

  void removeRecursively(
      std::shared_ptr<MutationNode> node,
      ShadowViewMutationList &mutations) const;
  bool startAnimationsRecursively(
      std::shared_ptr<MutationNode> node,
      const bool shouldRemoveSubviewsWithoutAnimations,
      const bool shouldAnimate,
      const bool isScreenPop,
      ShadowViewMutationList &mutations) const;
  void endAnimationsRecursively(
      std::shared_ptr<MutationNode> node,
      ShadowViewMutationList &mutations) const;
  void maybeDropAncestors(
      std::shared_ptr<Node> node,
      std::shared_ptr<MutationNode> child,
      ShadowViewMutationList &cleanupMutations) const;

  const ComponentDescriptor &getComponentDescriptorForShadowView(
      const ShadowView &shadowView) const;
#ifdef ANDROID
  void restoreOpacityInCaseOfFlakyEnteringAnimation(SurfaceId surfaceId) const;
  const ShadowNode *findInShadowTreeByTag(const ShadowNode &node, Tag tag)
      const;
#endif // ANDROID
  // MountingOverrideDelegate

  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry &telemetry,
      ShadowViewMutationList mutations) const override;

  // UIManagerAnimationDelegate

  void uiManagerDidConfigureNextLayoutAnimation(
      jsi::Runtime &runtime,
      const RawValue &config,
      const jsi::Value &successCallbackValue,
      const jsi::Value &failureCallbackValue) const override;

  void setComponentDescriptorRegistry(const SharedComponentDescriptorRegistry &
                                          componentDescriptorRegistry) override;

  bool shouldAnimateFrame() const override;

  void stopSurface(SurfaceId surfaceId) override;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
