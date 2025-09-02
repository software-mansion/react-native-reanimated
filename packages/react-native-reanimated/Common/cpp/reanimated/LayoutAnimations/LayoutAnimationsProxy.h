#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

#include <worklets/Tools/UIScheduler.h>

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <stack>

namespace reanimated {

class ReanimatedModuleProxy;

using namespace facebook;

struct LayoutAnimation {
#if REACT_NATIVE_MINOR_VERSION >= 78
  std::shared_ptr<ShadowView> finalView, currentView, startView;
  Tag parentTag;
#else
  std::shared_ptr<ShadowView> finalView, currentView, parentView;
#endif // REACT_NATIVE_MINOR_VERSION >= 78
  std::optional<double> opacity;
  int count = 1;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;
};

struct LayoutAnimationsProxy
    : public MountingOverrideDelegate,
      public std::enable_shared_from_this<LayoutAnimationsProxy> {
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
        mutable int myTag = 10002;
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
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  ContextContainer::Shared contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  jsi::Runtime &uiRuntime_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  LayoutAnimationsProxy(
      std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager,
      SharedComponentDescriptorRegistry componentDescriptorRegistry,
      ContextContainer::Shared contextContainer,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<UIScheduler> uiScheduler)
        : sharedTransitionManager_(layoutAnimationsManager->sharedTransitionManager_),
        layoutAnimationsManager_(layoutAnimationsManager),
        contextContainer_(contextContainer),
        componentDescriptorRegistry_(componentDescriptorRegistry),
        uiRuntime_(uiRuntime),
        uiScheduler_(uiScheduler) {
          lightNodes_[1] = std::make_shared<LightNode>();
          lightNodes_[11] = std::make_shared<LightNode>();

        }

  void startEnteringAnimation(const int tag, const ShadowViewMutation &mutation)
      const;
  void startExitingAnimation(const int tag, const ShadowViewMutation &mutation) const;
  void startLayoutAnimation(const int tag, const ShadowViewMutation &mutation)
      const;
  void startSharedTransition(const int tag, const ShadowView &before, const ShadowView &after, SurfaceId surfaceId)
            const;
        void startProgressTransition(const int tag, const ShadowView &before, const ShadowView &after, SurfaceId surfaceId)
                  const;
        void handleProgressTransition(ShadowViewMutationList &filteredMutations, const ShadowViewMutationList &mutations, const PropsParserContext &propsParserContext, SurfaceId surfaceId) const;
        
        void updateLightTree(const ShadowViewMutationList &mutations, ShadowViewMutationList& filteredMutations) const;
        
        void handleSharedTransitionsStart(const LightNode::Unshared &afterTopScreen, const LightNode::Unshared &beforeTopScreen, ShadowViewMutationList &filteredMutations, const ShadowViewMutationList &mutations, const PropsParserContext &propsParserContext, SurfaceId surfaceId) const;
        
        void cleanupSharedTransitions(ShadowViewMutationList &filteredMutations, const PropsParserContext &propsParserContext, SurfaceId surfaceId) const;
        
        void hideTransitioningViews(int index, ShadowViewMutationList &filteredMutations, const PropsParserContext &propsParserContext) const;

        
  void transferConfigFromNativeID(const std::string nativeId, const int tag)
      const;
  std::optional<SurfaceId> progressLayoutAnimation(
      int tag,
      const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
        std::optional<SurfaceId> onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward, bool isSwiping);
        std::optional<SurfaceId> onGestureCancel();

  void maybeCancelAnimation(const int tag) const;
        
        Tag findVisible(std::shared_ptr<LightNode> node,int& count) const;
        
        LightNode::Unshared findTopScreen(LightNode::Unshared node) const;
        
        void findSharedElementsOnScreen(LightNode::Unshared node, int index) const;
        
        LayoutMetrics getAbsoluteMetrics(LightNode::Unshared node) const;

  void handleRemovals(
      ShadowViewMutationList &filteredMutations,
      std::vector<std::shared_ptr<LightNode>> &roots) const;

  void addOngoingAnimations(
      SurfaceId surfaceId,
      ShadowViewMutationList &mutations) const;
  void updateOngoingAnimationTarget(
      const int tag,
      const ShadowViewMutation &mutation) const;
  std::shared_ptr<ShadowView> cloneViewWithoutOpacity(
      facebook::react::ShadowViewMutation &mutation,
      const PropsParserContext &propsParserContext) const;

    std::shared_ptr<ShadowView> cloneViewWithOpacity(
            facebook::react::ShadowViewMutation &mutation,
            const PropsParserContext &propsParserContext) const;
  void maybeRestoreOpacity(
      LayoutAnimation &layoutAnimation,
      const jsi::Object &newStyle) const;
  void maybeUpdateWindowDimensions(
      const facebook::react::ShadowViewMutation &mutation) const;
  void createLayoutAnimation(
      const ShadowViewMutation &mutation,
      ShadowView &oldView,
      const SurfaceId &surfaceId,
      const int tag) const;

  bool startAnimationsRecursively(
      std::shared_ptr<LightNode> node,
      const bool shouldRemoveSubviewsWithoutAnimations,
      const bool shouldAnimate,
      const bool isScreenPop,
      ShadowViewMutationList &mutations) const;
  void endAnimationsRecursively(
      std::shared_ptr<LightNode> node,
                                int index,
      ShadowViewMutationList &mutations) const;
  void maybeDropAncestors(
      std::shared_ptr<LightNode> node,
      std::shared_ptr<LightNode> child,
      ShadowViewMutationList &cleanupMutations) const;

  const ComponentDescriptor &getComponentDescriptorForShadowView(
      const ShadowView &shadowView) const;

  // MountingOverrideDelegate

  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry &telemetry,
      ShadowViewMutationList mutations) const override;
};

} // namespace reanimated
