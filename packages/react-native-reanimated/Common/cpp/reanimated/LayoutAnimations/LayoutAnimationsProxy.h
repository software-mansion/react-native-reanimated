#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/StaleSynchronousPropsTracker.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/graphics/Transform.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowTreeRevision.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>

#include <array>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

class LayoutAnimationsProxyRegistry;

using namespace facebook;

struct StartAnimationsRecursivelyConfig {
  bool shouldRemoveSubviewsWithoutAnimations;
  bool shouldAnimate;
  bool isScreenPop;
};

struct PendingNodeAnimation {
  std::shared_ptr<LightNode> node;
  std::shared_ptr<Serializable> config;
};

struct SharedContainer {
  SharedTag sharedTag;
  std::shared_ptr<LightNode> node;
  std::shared_ptr<LightNode> restoreBeforeNode;
  std::shared_ptr<LightNode> restoreAfterNode;
};

// One in-flight back gesture. Created on the first progress event, destroyed
// when a pull processes its END or CANCELLED state.
struct ProgressTransition {
  TransitionState state = TransitionState::START;
  std::shared_ptr<LightNode> sourceScreen;
  std::shared_ptr<LightNode> targetScreen;
  double progress = 0;
  bool updated = true;
};

// A finished gesture whose hidden source views wait for React to commit the
// navigation. The wait ends when React deletes sourceScreen, or a late cancel
// sets cancelled and the next pull restores sourceNodes.
struct UncommittedScreenPop {
  std::shared_ptr<LightNode> sourceScreen;
  std::vector<std::shared_ptr<LightNode>> sourceNodes;
  bool cancelled = false;
};

struct CollectedTransition {
  Transition transition;
  std::array<std::shared_ptr<LightNode>, 2> nodes;
};

using CollectedTransitionMap = std::unordered_map<SharedTag, CollectedTransition>;
using CollectedTransitions = std::vector<std::pair<SharedTag, CollectedTransition>>;

struct TransactionMeta {
  ShadowViewMutationList filteredMutations;
  ShadowViewMutationList teardownMutations;
  bool surfaceDropped = false;
  CollectedTransitionMap transitionMap;
  CollectedTransitions transitions;
  std::vector<PendingNodeAnimation> layout;
  std::vector<PendingNodeAnimation> entering;
  std::vector<PendingNodeAnimation> exiting;
  std::vector<std::shared_ptr<LightNode>> containersToInsert;
  std::vector<std::shared_ptr<LightNode>> nodesToRestore;
  std::vector<std::shared_ptr<LightNode>> containersToRemove;
  std::unordered_map<Tag, Tag> staleSnapshots;
};

struct LayoutAnimationsProxy : public LayoutAnimationsProxyCommon {
  mutable std::optional<ProgressTransition> transition_;
  mutable std::optional<UncommittedScreenPop> uncommittedScreenPop_;
  mutable std::shared_ptr<LightNode> topScreen_;
  mutable std::unordered_map<Tag, SharedContainer> sharedContainers_;
  mutable std::unordered_set<Tag> hiddenViewTags_;
  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  mutable std::unordered_map<Tag, std::shared_ptr<LightNode>> lightNodes_;
  mutable std::vector<std::pair<ShadowTreeRevision::Number, ShadowViewMutationList>> pendingTransactions_;
  mutable bool surfaceToRemove_ = false;
#ifdef ANDROID
  mutable bool cleanupPullScheduled_ = false;
#endif

#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshot_;
#endif
  mutable StaleSynchronousPropsTracker staleSynchronousProps_;
  void warnAboutStaleSynchronousProps(Tag tag, Tag staleTag, LayoutAnimationType type) const;
  void warnIfSnapshotIsStale(const ShadowView &snapshot, const TransactionMeta &transaction) const;

  LayoutAnimationsProxy(SurfaceId surfaceId, const LayoutAnimationsProxyDependencies &dependencies);

  void startEnteringAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config)
      const;
  void startExitingAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config) const;
  void startLayoutAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config) const;
  void startSharedTransition(
      int tag,
      const ShadowView &before,
      const ShadowView &after,
      const std::shared_ptr<Serializable> &config) const;
  void startProgressTransition(int tag, const ShadowView &before, const ShadowView &after) const;
  void handleProgressTransition(
      TransactionMeta &transaction,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext,
      bool popSettledThisPull) const;
  void resolveTransitionLifecycle(
      TransactionMeta &transaction,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;
  bool settleUncommittedScreenPop(TransactionMeta &transaction) const;
  void resolveDeferredSourceScreen() const;
  bool isLightNodeMapped(const std::shared_ptr<LightNode> &node) const;
  void unmapLightNode(const std::shared_ptr<LightNode> &node) const;

  void updateLightTree(
      const PropsParserContext &propsParserContext,
      const ShadowViewMutationList &mutations,
      TransactionMeta &transaction) const;

  std::optional<ShadowView>
  reparentLayoutAnimation(Tag tag, Tag parentTag, const ShadowView &newView, react::Point offset) const;

  void applyInitialMutationsToLightTree(const ShadowViewMutationList &mutations) const;
  void updateLightNodeProps(
      const std::shared_ptr<LightNode> &node,
      const ShadowView &oldView,
      const ShadowView &newView) const;
  void resolveLightNodeProps(const std::shared_ptr<LightNode> &node) const;
  void initializeLightTree(const ShadowTreeRevision &baseRevision);
  bool isLightTreeInitialized() const {
    return lightNodes_.contains(surfaceId_);
  }

  void applySynchronousProps(const UpdatesBatch &updatesBatch, bool trackInLightTree) const override;

  void reconcileContradictedRemovals(const ShadowViewMutationList &mutations, ShadowViewMutationList &filteredMutations)
      const;

  void handleSharedTransitionsStart(
      const std::shared_ptr<LightNode> &afterTopScreen,
      const std::shared_ptr<LightNode> &beforeTopScreen,
      TransactionMeta &transaction,
      const ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;

  bool shouldFlushStructuralMutations() const;
  void cleanupAnimations(
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext,
      bool flushStructuralMutations) const;
  void cleanupSharedTransitions(TransactionMeta &transaction, const PropsParserContext &propsParserContext) const;
#ifdef ANDROID
  bool hasPendingStructuralCleanup() const;
  void maybeScheduleCleanupPull(bool flushedStructuralMutations) const;
#endif

  void hideTransitioningViews(
      BeforeOrAfter index,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;

  void keepTransitioningViewsHidden(
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext) const;
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) override;
  void startSurface(
      const facebook::react::ShadowTree &shadowTree,
      std::weak_ptr<const facebook::react::MountingOverrideDelegate> mountingOverrideDelegate) override;
  std::optional<SurfaceId> onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) override;
  std::optional<SurfaceId> onGestureCancel(int tag) override;
  void shadowTreeWillCommit(bool isSurfaceRemoval) override;
  void clearSurfaceState() const override;

  std::shared_ptr<LightNode> findActiveBoundary(const std::shared_ptr<LightNode> &node) const;
  std::shared_ptr<LightNode> findBoundaryGuess(const std::shared_ptr<LightNode> &node) const;

  void findSharedElementsOnScreen(
      const std::shared_ptr<LightNode> &node,
      BeforeOrAfter index,
      TransactionMeta &transaction) const;

  void insertContainers(TransactionMeta &transaction, int &rootChildCount) const;

  void removeSharedContainer(Tag containerTag, TransactionMeta &transaction) const;

  std::vector<react::Point> getAbsolutePositionsForRootPathView(
      const std::shared_ptr<LightNode> &node,
      bool useViewsOnScreen) const;
  const ShadowView &viewOnScreen(const std::shared_ptr<LightNode> &node) const;

  Tag getOrCreateContainer(
      const ShadowView &before,
      const SharedTag &sharedTag,
      const std::array<std::shared_ptr<LightNode>, 2> &nodes,
      TransactionMeta &transaction) const;

  void overrideTransform(
      ShadowView &shadowView,
      const std::optional<Transform> &transform,
      const PropsParserContext &propsParserContext) const;

  struct AncestorTransform {
    Transform transform;
    TransformOrigin origin;
    react::Size ownSize;
  };

  std::optional<Transform> parseParentTransforms(
      const std::shared_ptr<LightNode> &node,
      const std::vector<react::Point> &absolutePositions,
      bool useViewsOnScreen) const;
  react::Transform resolveTransform(
      const react::Size &originFrameSize,
      const react::Size &ownSize,
      const Transform &transform,
      const TransformOrigin &transformOrigin) const;
  std::array<float, 3>
  getTranslateForTransformOrigin(float viewWidth, float viewHeight, const TransformOrigin &transformOrigin) const;

  void handleSubtreeRemoval(
      const std::shared_ptr<LightNode> &node,
      const std::shared_ptr<LightNode> &parent,
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
