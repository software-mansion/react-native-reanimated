#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/Tools/UIScheduler.h>

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/graphics/Transform.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

class ReanimatedModuleProxy;

using namespace facebook;
using namespace reanimated;

struct StartAnimationsRecursivelyConfig {
  bool shouldRemoveSubviewsWithoutAnimations;
  bool shouldAnimate;
  bool isScreenPop;
};

struct LayoutAnimationsProxy_Experimental : public LayoutAnimationsProxyCommon,
                                            public std::enable_shared_from_this<LayoutAnimationsProxy_Experimental> {
  mutable std::recursive_mutex mutex;
  mutable SurfaceManager surfaceManager;
  mutable std::unordered_set<std::shared_ptr<LightNode>> deadNodes;
  mutable std::unordered_map<Tag, int> leastRemoved;
  mutable std::unordered_set<Tag> activeTransitions_;
  mutable Tag transitionTag_;
  mutable double transitionProgress_;
  mutable bool transitionUpdated_;
  mutable TransitionState transitionState_ = NONE;
  mutable SurfaceId transitioningSurfaceId_ = -1;
  mutable std::unordered_map<SurfaceId, std::shared_ptr<LightNode>> topScreen;
  mutable int containerTag_ = 10000002;
  mutable std::vector<Tag> sharedContainersToRemove_;
  mutable std::unordered_map<Tag, Tag[2]> restoreMap_;
  mutable std::vector<Tag> tagsToRestore_;
  mutable TransitionMap transitionMap_;
  mutable Transitions transitions_;
  mutable bool synchronized_ = true;
  mutable std::vector<std::shared_ptr<LightNode>> entering_, layout_, exiting_;
  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  mutable std::unordered_map<Tag, std::shared_ptr<LightNode>> lightNodes_;
  mutable std::vector<std::shared_ptr<LightNode>> containersToInsert_;
  mutable std::unordered_map<Tag, react::Transform> transformForNode_;

  mutable ForceScreenSnapshotFunction forceScreenSnapshot_;

  LayoutAnimationsProxy_Experimental(
      std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager,
      SharedComponentDescriptorRegistry componentDescriptorRegistry,
      std::shared_ptr<const ContextContainer> contextContainer,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<UIScheduler> uiScheduler
#ifdef ANDROID
      ,
      PreserveMountedTagsFunction filterUnmountedTagsFunction,
      std::shared_ptr<UIManager> uiManager,
      std::shared_ptr<CallInvoker> jsInvoker
#endif
      )
      : LayoutAnimationsProxyCommon(
            layoutAnimationsManager,
            componentDescriptorRegistry,
            contextContainer,
            uiRuntime,
            uiScheduler
#ifdef ANDROID
            ,
            filterUnmountedTagsFunction,
            uiManager,
            jsInvoker
#endif
            ),
        sharedTransitionManager_(layoutAnimationsManager->getSharedTransitionManager()) {
  }

  void startEnteringAnimation(const std::shared_ptr<LightNode> &node) const;
  void startExitingAnimation(const std::shared_ptr<LightNode> &node) const;
  void startLayoutAnimation(const std::shared_ptr<LightNode> &node) const;
  void startSharedTransition(const int tag, const ShadowView &before, const ShadowView &after, SurfaceId surfaceId)
      const;
  void startProgressTransition(const int tag, const ShadowView &before, const ShadowView &after, SurfaceId surfaceId)
      const;
  void handleProgressTransition(
      ShadowViewMutationList &filteredMutations,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;

  void updateLightTree(
      const PropsParserContext &propsParserContext,
      const ShadowViewMutationList &mutations,
      ShadowViewMutationList &filteredMutations) const;

  void handleSharedTransitionsStart(
      const std::shared_ptr<LightNode> &afterTopScreen,
      const std::shared_ptr<LightNode> &beforeTopScreen,
      ShadowViewMutationList &filteredMutations,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;

  void cleanupAnimations(
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;
  void cleanupSharedTransitions(
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;

#ifdef __APPLE__
  void setForceScreenSnapshotFunction(ForceScreenSnapshotFunction forceScreenSnapshot) {
    forceScreenSnapshot_ = std::move(forceScreenSnapshot);
  }
#endif

  void hideTransitioningViews(
      BeforeOrAfter index,
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext) const;

  void transferConfigFromNativeID(const std::string &nativeId, const int tag) const;
  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle) override;
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) override;
  std::optional<SurfaceId> onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) override;
  std::optional<SurfaceId> onGestureCancel() override;
  void startSurface(const SurfaceId surfaceId) override;

  void maybeCancelAnimation(const int tag) const;

  std::shared_ptr<LightNode> findTopScreen(const std::shared_ptr<LightNode> &node) const;

  void findSharedElementsOnScreen(
      const std::shared_ptr<LightNode> &node,
      BeforeOrAfter index,
      const PropsParserContext &propsParserContext) const;

  void insertContainers(ShadowViewMutationList &filteredMutations, int &rootChildCount, SurfaceId surfaceId) const;

  std::vector<react::Point> getAbsolutePositionsForRootPathView(const std::shared_ptr<LightNode> &node) const;

  void transferConfigToContainer(Tag containerTag, Tag beforeTag) const;

  Tag getOrCreateContainer(
      const ShadowView &before,
      const SharedTag &sharedTag,
      ShadowViewMutationList &filteredMutations,
      SurfaceId surfaceId) const;

  void overrideTransform(
      ShadowView &shadowView,
      const std::optional<Transform> &transform,
      const PropsParserContext &propsParserContext) const;

  std::optional<Transform> parseParentTransforms(
      const std::shared_ptr<LightNode> &node,
      const std::vector<react::Point> &absolutePositions) const;
  react::Transform resolveTransform(
      const LayoutMetrics &layoutMetrics,
      const Transform &transform,
      const TransformOrigin &transformOrigin) const;
  std::array<float, 3>
  getTranslateForTransformOrigin(float viewWidth, float viewHeight, const TransformOrigin &transformOrigin) const;

  void handleRemovals(ShadowViewMutationList &filteredMutations, std::vector<std::shared_ptr<LightNode>> &roots) const;

  void addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList &mutations) const;
  void updateOngoingAnimationTarget(const int tag, const ShadowViewMutation &mutation) const;
  ShadowView cloneViewWithoutOpacity(const ShadowView &shadowView, const PropsParserContext &propsParserContext) const;

  ShadowView cloneViewWithOpacity(const ShadowView &shadowView, const PropsParserContext &propsParserContext) const;
  void maybeRestoreOpacity(reanimated::LayoutAnimation &layoutAnimation, const jsi::Object &newStyle) const;
  void maybeUpdateWindowDimensions(const facebook::react::ShadowViewMutation &mutation) const;
  ShadowView maybeCreateLayoutAnimation(ShadowView &before, const ShadowView &after, const Tag parentTag) const;

  bool startAnimationsRecursively(
      const std::shared_ptr<LightNode> &node,
      ShadowViewMutationList &mutations,
      StartAnimationsRecursivelyConfig config) const;
  void endAnimationsRecursively(const std::shared_ptr<LightNode> &node, int index, ShadowViewMutationList &mutations)
      const;
  void maybeDropAncestors(const std::shared_ptr<LightNode> &node, ShadowViewMutationList &cleanupMutations) const;

  const ComponentDescriptor &getComponentDescriptorForShadowView(const ShadowView &shadowView) const;

  // MountingOverrideDelegate

  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry &telemetry,
      ShadowViewMutationList mutations) const override;
};

} // namespace reanimated
