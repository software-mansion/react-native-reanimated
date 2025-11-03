#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
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
#include <stack>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated_experimental {

class ReanimatedModuleProxy;

using namespace facebook;
using namespace reanimated;

struct LayoutAnimation {
  ShadowView finalView, currentView, startView;
  Tag parentTag;
  std::optional<double> opacity;
  int count = 1;
  bool isViewAlreadyMounted = false;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;
};

struct LayoutAnimationsProxy_Experimental : public MountingOverrideDelegate,
                                            public std::enable_shared_from_this<LayoutAnimationsProxy_Experimental> {
  mutable std::unordered_map<Tag, std::shared_ptr<Node>> nodeForTag_;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  mutable std::recursive_mutex mutex;
  mutable SurfaceManager surfaceManager;
  mutable std::unordered_set<std::shared_ptr<LightNode>> deadNodes;
  mutable std::unordered_map<Tag, int> leastRemoved;
  mutable std::unordered_set<Tag> activeTransitions_;
  mutable Tag transitionTag_;
  mutable double transitionProgress_;
  mutable bool transitionUpdated_;
  mutable TransitionState transitionState_ = NONE;
  mutable std::unordered_map<SurfaceId, std::shared_ptr<LightNode>> topScreen;
  mutable int myTag = 10000002;
  mutable std::vector<Tag> sharedContainersToRemove_;
  mutable std::unordered_map<Tag, Tag[2]> restoreMap_;
  mutable std::vector<Tag> tagsToRestore_;
  mutable TransitionMap transitionMap_;
  mutable Transitions transitions_;
  mutable bool synchronized_ = true;
  mutable std::vector<LightNode::Unshared> entering_, layout_, exiting_;
  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  //  mutable std::unordered_map<
  //        mutable std::optional<ShadowView> previousView;
  mutable std::unordered_map<Tag, std::shared_ptr<LightNode>> lightNodes_;
  mutable std::vector<LightNode::Unshared> containersToInsert_;
  mutable std::unordered_map<Tag, react::Transform> transformForNode_;

  mutable std::vector<Tag> finishedAnimationTags_;
  mutable ForceScreenSnapshotFunction forceScreenSnapshot_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  std::shared_ptr<const ContextContainer> contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  jsi::Runtime &uiRuntime_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  PreserveMountedTagsFunction preserveMountedTags_;
#ifdef ANDROID
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<CallInvoker> jsInvoker_;
#endif

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
      : sharedTransitionManager_(layoutAnimationsManager->sharedTransitionManager_),
        layoutAnimationsManager_(layoutAnimationsManager),
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
    lightNodes_[1] = std::make_shared<LightNode>();
    lightNodes_[11] = std::make_shared<LightNode>();
  }

  void startEnteringAnimation(const LightNode::Unshared &node) const;
  void startExitingAnimation(const LightNode::Unshared &node) const;
  void startLayoutAnimation(const LightNode::Unshared &node) const;
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
      const LightNode::Unshared &afterTopScreen,
      const LightNode::Unshared &beforeTopScreen,
      ShadowViewMutationList &filteredMutations,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;

  void cleanupAnimations(
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;

#ifdef __APPLE__
  void setForceScreenSnapshotFunction(ForceScreenSnapshotFunction f) {
    forceScreenSnapshot_ = std::move(f);
  }
#endif

  void hideTransitioningViews(
      int index,
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext) const;

  void transferConfigFromNativeID(const std::string nativeId, const int tag) const;
  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
  std::optional<SurfaceId>
  onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward, bool isSwiping);
  std::optional<SurfaceId> onGestureCancel();

  void maybeCancelAnimation(const int tag) const;

  LightNode::Unshared findTopScreen(LightNode::Unshared node) const;

  void findSharedElementsOnScreen(
      const LightNode::Unshared &node,
      int index,
      const PropsParserContext &propsParserContext) const;

  void insertContainers(ShadowViewMutationList &filteredMutations, int &rootChildCount, SurfaceId surfaceId) const;

  std::vector<react::Point> getAbsolutePositionsForRootPathView(const LightNode::Unshared &node) const;

  void transferConfigToContainer(Tag containerTag, Tag beforeTag) const;

  Tag getOrCreateContainer(
      const ShadowView &before,
      SharedTag sharedTag,
      ShadowViewMutationList &filteredMutations,
      SurfaceId surfaceId) const;

  void overrideTransform(
      ShadowView &shadowView,
      const std::optional<Transform> &transform,
      const PropsParserContext &propsParserContext) const;

  std::optional<Transform> parseParentTransforms(
      const LightNode::Unshared &node,
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
  void maybeRestoreOpacity(LayoutAnimation &layoutAnimation, const jsi::Object &newStyle) const;
  void maybeUpdateWindowDimensions(const facebook::react::ShadowViewMutation &mutation) const;
  ShadowView createLayoutAnimation(ShadowView &before, const ShadowView &after, const Tag parentTag) const;

  bool startAnimationsRecursively(
      std::shared_ptr<LightNode> node,
      const bool shouldRemoveSubviewsWithoutAnimations,
      const bool shouldAnimate,
      const bool isScreenPop,
      ShadowViewMutationList &mutations) const;
  void endAnimationsRecursively(std::shared_ptr<LightNode> node, int index, ShadowViewMutationList &mutations) const;
  void maybeDropAncestors(
      std::shared_ptr<LightNode> node,
      std::shared_ptr<LightNode> child,
      ShadowViewMutationList &cleanupMutations) const;

  const ComponentDescriptor &getComponentDescriptorForShadowView(const ShadowView &shadowView) const;
#ifdef ANDROID
  void restoreOpacityInCaseOfFlakyEnteringAnimation(SurfaceId surfaceId) const;
  const ShadowNode *findInShadowTreeByTag(const ShadowNode &node, Tag tag) const;
#endif // ANDROID
  // MountingOverrideDelegate

  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry &telemetry,
      ShadowViewMutationList mutations) const override;
};

} // namespace reanimated_experimental
