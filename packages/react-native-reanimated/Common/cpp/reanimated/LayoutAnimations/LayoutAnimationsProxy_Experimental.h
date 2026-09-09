#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/graphics/Transform.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowTreeRevision.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

class ReanimatedModuleProxy;
class LayoutAnimationsProxyRegistry;

using namespace facebook;
using namespace reanimated;

struct StartAnimationsRecursivelyConfig {
  bool shouldRemoveSubviewsWithoutAnimations;
  bool shouldAnimate;
  bool isScreenPop;
};

struct PendingNodeAnimation {
  std::shared_ptr<LightNode> node;
  std::shared_ptr<Serializable> config;
};

struct TransactionMeta {
  ShadowViewMutationList filteredMutations;
  ShadowViewMutationList teardownMutations;
  TransitionMap transitionMap;
  Transitions transitions;
  std::vector<PendingNodeAnimation> layout;
  std::vector<PendingNodeAnimation> entering;
  std::vector<PendingNodeAnimation> exiting;
  std::vector<std::shared_ptr<LightNode>> containersToInsert;
  std::vector<Tag> tagsToRestore;
  std::vector<Tag> sharedContainersToRemove;
};

struct LayoutAnimationsProxy_Experimental : public LayoutAnimationsProxyCommon {
  mutable std::unordered_set<Tag> activeTransitions_;
  mutable Tag transitionTag_;
  mutable double transitionProgress_;
  mutable bool transitionUpdated_;
  mutable TransitionState transitionState_ = TransitionState::NONE;
  mutable std::shared_ptr<LightNode> topScreen_;
  mutable std::unordered_map<Tag, Tag[2]> restoreMap_;
  mutable std::unordered_map<std::string, Tag> containerTags_;
  mutable bool synchronized_ = true;
  mutable Tag closingScreenTag_ = -1;
  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  mutable std::unordered_map<Tag, std::shared_ptr<LightNode>> lightNodes_;
  mutable std::vector<std::pair<ShadowTreeRevision::Number, ShadowViewMutationList>> pendingTransactions_;

  mutable ForceScreenSnapshotFunction forceScreenSnapshot_;

  LayoutAnimationsProxy_Experimental(SurfaceId surfaceId, const LayoutAnimationsProxyDependencies &dependencies);

  void startEnteringAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config)
      const;
  void startExitingAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config) const;
  void startLayoutAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config) const;
  void startSharedTransition(
      int tag,
      const ShadowView &before,
      const ShadowView &after,
      const std::shared_ptr<Serializable> &config) const;
  void startProgressTransition(const int tag, const ShadowView &before, const ShadowView &after) const;
  void handleProgressTransition(
      TransactionMeta &transaction,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;

  void updateLightTree(
      const PropsParserContext &propsParserContext,
      const ShadowViewMutationList &mutations,
      TransactionMeta &transaction) const;

  void applyInitialMutationsToLightTree(const ShadowViewMutationList &mutations) const;
  void initializeLightTree(const ShadowTreeRevision &baseRevision);
  bool isLightTreeInitialized() const {
    return lightNodes_.contains(surfaceId_);
  }

  void reconcileContradictedRemovals(const ShadowViewMutationList &mutations, ShadowViewMutationList &filteredMutations)
      const;

  void handleSharedTransitionsStart(
      const std::shared_ptr<LightNode> &afterTopScreen,
      const std::shared_ptr<LightNode> &beforeTopScreen,
      TransactionMeta &transaction,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;

  void cleanupAnimations(TransactionMeta &transaction, const PropsParserContext &propsParserContext) const;
  void cleanupSharedTransitions(TransactionMeta &transaction, const PropsParserContext &propsParserContext) const;

  void hideTransitioningViews(
      BeforeOrAfter index,
      const Transitions &transitions,
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;

  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) override;
  void startSurface(
      const facebook::react::ShadowTree &shadowTree,
      std::weak_ptr<const facebook::react::MountingOverrideDelegate> mountingOverrideDelegate) override;
  std::optional<SurfaceId> onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) override;
  std::optional<SurfaceId> onGestureCancel(int tag) override;
  void surfaceDidUnmount() override;

  void maybeCancelAnimation(const int tag) const;

  std::shared_ptr<LightNode> findActiveBoundary(const std::shared_ptr<LightNode> &node) const;
  std::shared_ptr<LightNode> findBoundaryGuess(const std::shared_ptr<LightNode> &node) const;

  void findSharedElementsOnScreen(
      const std::shared_ptr<LightNode> &node,
      BeforeOrAfter index,
      const PropsParserContext &propsParserContext,
      TransactionMeta &transaction) const;

  void insertContainers(TransactionMeta &transaction, int &rootChildCount) const;

  void removeSharedContainer(Tag containerTag, TransactionMeta &transaction) const;

  std::vector<react::Point> getAbsolutePositionsForRootPathView(const std::shared_ptr<LightNode> &node) const;

  Tag getOrCreateContainer(const ShadowView &before, const SharedTag &sharedTag, TransactionMeta &transaction) const;

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

  void handleSubtreeRemoval(
      const std::shared_ptr<LightNode> &node,
      const std::shared_ptr<LightNode> &parent,
      int hostIndex,
      TransactionMeta &transaction) const;
  void flushCompletedRemovals(ShadowViewMutationList &filteredMutations) const;

  void addOngoingAnimations(ShadowViewMutationList &mutations) const;
  ShadowView cloneViewWithoutOpacity(const ShadowView &shadowView, const PropsParserContext &propsParserContext) const;

  bool startAnimationsRecursively(
      const std::shared_ptr<LightNode> &node,
      TransactionMeta &transaction,
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

std::shared_ptr<LayoutAnimationsProxyRegistry> createLayoutAnimationsProxyExperimentalRegistry(
    const LayoutAnimationsProxyDependencies &dependencies);

} // namespace reanimated
