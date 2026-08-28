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
#include <utility>
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

struct LayoutAnimationsProxy : public LayoutAnimationsProxyCommon,
                               public std::enable_shared_from_this<LayoutAnimationsProxy> {
  mutable std::unordered_set<std::shared_ptr<LightNode>> deadNodes;
  mutable std::unordered_map<Tag, int> leastRemoved;
  mutable std::unordered_set<Tag> activeTransitions_;
  mutable Tag transitionTag_;
  mutable double transitionProgress_;
  mutable bool transitionUpdated_;
  mutable TransitionState transitionState_ = TransitionState::NONE;
  mutable std::shared_ptr<LightNode> topScreen_;
  mutable std::vector<Tag> sharedContainersToRemove_;
  mutable std::unordered_map<Tag, Tag[2]> restoreMap_;
  mutable std::unordered_map<std::string, Tag> containerTags_;
  mutable std::vector<Tag> tagsToRestore_;
  mutable TransitionMap transitionMap_;
  mutable Transitions transitions_;
  mutable std::unordered_set<Tag> hiddenViewTags_;
  mutable bool synchronized_ = true;
  mutable Tag closingScreenTag_ = -1;
  mutable std::vector<std::shared_ptr<LightNode>> entering_, layout_, exiting_;
  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  mutable std::unordered_map<Tag, std::shared_ptr<LightNode>> lightNodes_;
  mutable std::vector<std::pair<ShadowTreeRevision::Number, ShadowViewMutationList>> pendingTransactions_;
  mutable std::vector<std::shared_ptr<LightNode>> containersToInsert_;
  mutable std::unordered_map<Tag, react::Transform> transformForNode_;
#ifndef ANDROID
  mutable std::unordered_map<Tag, folly::dynamic> synchronousPropsOverlay_;
#endif

  mutable ForceScreenSnapshotFunction forceScreenSnapshot_;

  LayoutAnimationsProxy(SurfaceId surfaceId, const LayoutAnimationsProxyDependencies &dependencies);

  void startEnteringAnimation(const std::shared_ptr<LightNode> &node) const;
  void startExitingAnimation(const std::shared_ptr<LightNode> &node) const;
  void startLayoutAnimation(const std::shared_ptr<LightNode> &node) const;
  void startSharedTransition(const int tag, const ShadowView &before, const ShadowView &after) const;
  void startProgressTransition(const int tag, const ShadowView &before, const ShadowView &after) const;
  void handleProgressTransition(
      ShadowViewMutationList &filteredMutations,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;

  void updateLightTree(
      const PropsParserContext &propsParserContext,
      const ShadowViewMutationList &mutations,
      ShadowViewMutationList &filteredMutations,
      ShadowViewMutationList &teardownMutations) const;

  void applyInitialMutationsToLightTree(const ShadowViewMutationList &mutations) const;
  void initializeLightTree(const ShadowTreeRevision &baseRevision);
  bool isLightTreeInitialized() const {
    return lightNodes_.contains(surfaceId_);
  }

  void applySynchronousProps(const UpdatesBatch &updatesBatch, const std::unordered_set<Tag> &skipOverlayTags)
      const override;
  void dropSynchronousProps(const std::vector<Tag> &tags) const override;
#ifndef ANDROID
  void reapplySynchronousPropsOverlay(
      const std::shared_ptr<LightNode> &node,
      const PropsParserContext &propsParserContext) const;
#endif

  void reconcileContradictedRemovals(const ShadowViewMutationList &mutations, ShadowViewMutationList &filteredMutations)
      const;

  void handleSharedTransitionsStart(
      const std::shared_ptr<LightNode> &afterTopScreen,
      const std::shared_ptr<LightNode> &beforeTopScreen,
      ShadowViewMutationList &filteredMutations,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;

  void cleanupAnimations(ShadowViewMutationList &filteredMutations, const PropsParserContext &propsParserContext) const;
  void cleanupSharedTransitions(ShadowViewMutationList &filteredMutations, const PropsParserContext &propsParserContext)
      const;

  void hideTransitioningViews(
      BeforeOrAfter index,
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext) const;

  void keepTransitioningViewsHidden(
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext) const;

  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle) override;
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
      const PropsParserContext &propsParserContext) const;

  void insertContainers(ShadowViewMutationList &filteredMutations, int &rootChildCount) const;

  std::vector<react::Point> getAbsolutePositionsForRootPathView(const std::shared_ptr<LightNode> &node) const;

  void transferConfigToContainer(Tag containerTag, Tag beforeTag) const;

  Tag getOrCreateContainer(
      const ShadowView &before,
      const SharedTag &sharedTag,
      ShadowViewMutationList &filteredMutations) const;

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
      ShadowViewMutationList &filteredMutations,
      ShadowViewMutationList &teardownMutations) const;
  void flushDeadNodes(ShadowViewMutationList &filteredMutations) const;

  void addOngoingAnimations(ShadowViewMutationList &mutations) const;
  void updateOngoingAnimationTarget(const int tag, const ShadowViewMutation &mutation) const;
  ShadowView cloneViewWithoutOpacity(const ShadowView &shadowView, const PropsParserContext &propsParserContext) const;

  ShadowView cloneViewWithOpacity(const ShadowView &shadowView, const PropsParserContext &propsParserContext) const;
  void maybeRestoreOpacity(reanimated::LayoutAnimation &layoutAnimation, const jsi::Object &newStyle) const;
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

std::shared_ptr<LayoutAnimationsProxyRegistry> createLayoutAnimationsProxyDefaultRegistry(
    const LayoutAnimationsProxyDependencies &dependencies);

} // namespace reanimated
