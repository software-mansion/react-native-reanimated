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
#include <chrono>
#include <cstdint>
#include <memory>
#include <optional>
#include <ranges>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

class LayoutAnimationsProxyRegistry;

using namespace facebook;

struct SubtreeRemovalConfig {
  bool shouldRemoveSubviewsWithoutAnimations;
  bool shouldAnimate;
  bool isScreenPop;
};

struct PendingNodeAnimation {
  std::shared_ptr<LightNode> node;
  std::shared_ptr<Serializable> config;
};

// The children of the carrier fade with the progress of the run. When the carrier lands, the children
// of the target fade in.
struct ContentFade {
  SharedTransitionContentFade options;
  ContentOpacityRange range;
  double mountedOpacity = 1;
  std::unordered_map<Tag, std::shared_ptr<LightNode>> fadedChildren;
};

// The time of the animation moves the carrier, or the progress of a back gesture moves it.
enum class SharedTransitionDriver : std::uint8_t {
  TIME,
  GESTURE,
};

// A retiring run has no reason to continue, but the frames of its carrier are not in the mount queue yet. It ends in
// the first pull that can remove views after those frames are queued. A finished run stays in the registry until
// the end of the pull, so that a finish does not invalidate the runs that a caller holds.
enum class SharedTransitionLifecycle : std::uint8_t {
  ACTIVE,
  RETIRING,
  FINISHED,
};

// The carrier is the view that the run animates, moved from its parent to the root for the time of the
// run. A new run moves its source. A run that reverses keeps its carrier, which is then its target.
struct SharedTransitionRun {
  SharedTag sharedTag;
  std::shared_ptr<LightNode> carrier;
  ShadowView carrierStartView;
  std::shared_ptr<LightNode> source;
  std::shared_ptr<LightNode> target;
  // The source can be released while the run follows its target, which releases the configs of the source.
  std::shared_ptr<Serializable> config;
  SharedTransitionDriver driver = SharedTransitionDriver::TIME;
  SharedTransitionLifecycle lifecycle = SharedTransitionLifecycle::ACTIVE;
  std::optional<ContentFade> contentFade;
  bool targetOffWindow = false;
};

// The first reason, in this order, why a run does not land in a pull.
enum class LandingBlocker : std::uint8_t {
  NONE,
  CARRIER_NOT_ENDED,
  NO_STRUCTURAL_FLUSH,
  CARRIER_FRAMES_UNQUEUED,
  LANDS_WITH_OTHER_RUNS,
  TARGET_IN_HIDDEN_VIEW,
  TARGET_OFF_WINDOW,
};

// Asks to show a view that the shared tag hid. The request is stale when the
// view is hidden for a different shared tag now. A finished run asks to show
// its target, and shows its source if the target is removed or exiting.
struct RestoreRequest {
  SharedTag sharedTag;
  std::shared_ptr<LightNode> node;
  std::shared_ptr<LightNode> sourceIfTargetGone = nullptr;
};

struct HiddenView {
  std::shared_ptr<LightNode> node;
  bool restoreDeferred = false;
};

// A view in hiddenViews stays at opacity 0 until it is restored or removed,
// also after the run ends. A view is in the hiddenViews of one shared tag only,
// and only while its node is mapped.
struct SharedElement {
  std::vector<HiddenView> hiddenViews;
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
// sets cancelled and the next pull restores sources.
struct UncommittedScreenPop {
  std::shared_ptr<LightNode> sourceScreen;
  std::vector<RestoreRequest> sources;
  bool cancelled = false;
};

// A node on the path from a shared element up to the root, as it was when the element was collected.
struct Ancestor {
  Tag tag;
  react::Point scrollPosition;
  Transform transform;
  TransformOrigin origin;
  react::Size ownSize;
};

// The first ancestor, from the view up, that the platform shows outside the view of its React parent, and its position
// in the absolute positions of the path.
struct AncestorOutsideReactParent {
  size_t index;
  react::Point position;
};

struct CollectedTransition {
  Transition transition;
  std::array<std::shared_ptr<LightNode>, 2> nodes;
  std::array<std::vector<react::Point>, 2> absolutePositions;
  std::array<std::vector<Ancestor>, 2> ancestors;
};

using CollectedTransitionMap = std::unordered_map<SharedTag, CollectedTransition>;
using CollectedTransitions = std::vector<std::pair<SharedTag, CollectedTransition>>;

#ifdef __APPLE__
struct HeldModal {
  std::shared_ptr<LightNode> node;
  std::chrono::steady_clock::time_point removableAt;
};
#endif

struct TransactionMeta {
  ShadowViewMutationList filteredMutations;
  ShadowViewMutationList teardownMutations;
  bool surfaceDropped = false;
  CollectedTransitionMap transitionMap;
  CollectedTransitions transitions;
  std::vector<PendingNodeAnimation> layout;
  std::vector<PendingNodeAnimation> entering;
  std::vector<PendingNodeAnimation> exiting;
  std::vector<std::shared_ptr<LightNode>> removedSubtrees;
  std::vector<RestoreRequest> restoreRequests;
  // the place in filteredMutations of the first Remove of a screen that React Native Screens snapshots
  std::optional<size_t> screenSnapshotRemoval;
  std::unordered_map<Tag, Tag> staleSnapshots;
  std::unordered_set<Tag> dueRemovals;
  std::vector<std::shared_ptr<LightNode>> modalsToHold;
  std::unordered_set<Tag> recreatedTags;
  // Whatever changes a node's children or their exiting states during updateLightTree must reset its cursors.
  std::unordered_map<Tag, IndexCursors> indexCursors;
};

struct LayoutAnimationsProxy : public LayoutAnimationsProxyCommon {
  mutable std::optional<ProgressTransition> transition_;
  mutable std::optional<UncommittedScreenPop> uncommittedScreenPop_;
  mutable std::shared_ptr<LightNode> topScreen_;
  // Set whenever the active boundary might no longer be `topScreen_`: on a structural change, a boundary's props
  // changing or a node leaving the light tree. A light node never becomes live again, so nothing else changes it.
  mutable bool activeBoundaryMayHaveChanged_ = true;
  // Views the light tree replaced, often the last owners of their props. Destroyed off the UI thread.
  mutable std::vector<ShadowView> droppedViews_;
  // screens that forceScreenSnapshot_ switched to snapshots after updates; React Native Screens never switches them
  // back
  mutable std::unordered_set<Tag> snapshottedScreens_;
  // A screen becomes visible when its appear transition ends or its dismiss gesture is cancelled.
  // It stays visible until its disappear transition ends. Only a visible screen can be the source
  // of a back transition.
  mutable std::unordered_set<Tag> visibleScreens_;
  mutable std::unordered_map<SharedTag, SharedElement> sharedElements_;
  // The runs by the tag of their carrier. A view carries one run, and a shared tag has one active run.
  mutable std::unordered_map<Tag, SharedTransitionRun> sharedTransitionRuns_;
  mutable CarrierPlacements carrierPlacements_;
  // Entering animations of target children that wait until their run lands.
  mutable std::vector<PendingNodeAnimation> heldEnterings_;
  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  mutable std::unordered_map<Tag, std::shared_ptr<LightNode>> lightNodes_;
  mutable std::unordered_set<Tag> unmappedContentFadeTags_;
  // removed components whose views are still shown; their shared transition configs are released when they unmap
  mutable std::unordered_set<Tag> deferredSharedTransitionConfigReleases_;
  mutable std::vector<std::pair<ShadowTreeRevision::Number, ShadowViewMutationList>> pendingTransactions_;
  mutable bool surfaceToRemove_ = false;
#ifdef ANDROID
  ReleaseViewTransitionsFunction releaseViewTransitions_;
  void releaseViewTransitionsOfMovedCarriers(const ShadowViewMutationList &mutations) const;
  bool isInRemovedScreen(const std::shared_ptr<LightNode> &node, const ShadowViewMutationList &mutations) const;
  mutable bool cleanupPullScheduled_ = false;
  // tags of JS-thread batches that are not in the mount queue yet
  mutable std::unordered_map<Tag, int> unqueuedBatchTags_;
  // carriers whose last UI-thread frames are not in the mount queue yet
  mutable std::unordered_map<Tag, int> unqueuedCarrierFrames_;
#endif

#ifdef __APPLE__
  mutable std::vector<HeldModal> heldModals_;
  ForceScreenSnapshotFunction forceScreenSnapshot_;
  SetSharedTransitionOverlayFunction setSharedTransitionOverlay_;
  NativeViewPlacementFunction nativeViewPlacement_;
  // iOS presents modals above the root view, so detached carriers live in a view that the platform keeps on top of the
  // window. It lives until its surface stops.
  mutable std::shared_ptr<LightNode> carrierOverlay_;
#endif
  mutable StaleSynchronousPropsTracker staleSynchronousProps_;
  void warnAboutStaleSynchronousProps(Tag tag, Tag staleTag, LayoutAnimationType type) const;
  void warnIfSnapshotIsStale(const ShadowView &snapshot, const TransactionMeta &transaction) const;

  LayoutAnimationsProxy(SurfaceId surfaceId, const LayoutAnimationsProxyDependencies &dependencies);

  void startEnteringAnimation(
      const std::shared_ptr<LightNode> &node,
      const std::shared_ptr<Serializable> &config,
      bool isContentFadeIn = false) const;
  void startExitingAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config) const;
  void startLayoutAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config) const;
  void startSharedTransition(
      const std::shared_ptr<LightNode> &carrier,
      const ShadowView &before,
      const ShadowView &after,
      const Props::Shared &frameProps,
      const std::shared_ptr<Serializable> &config,
      std::optional<ContentOpacityRange> contentOpacity) const;
  std::optional<ContentOpacityRange> restartContentFade(SharedTransitionRun &run) const;
  double contentOpacityOnScreen(const SharedTransitionRun &run) const;
  std::vector<std::shared_ptr<LightNode>> fadingChildren(
      const std::shared_ptr<LightNode> &node,
      const std::unordered_set<Tag> &hiddenTags) const;
  ShadowView withContentOpacity(
      const std::shared_ptr<LightNode> &child,
      const ShadowView &view,
      double contentOpacity,
      const PropsParserContext &propsParserContext) const;
  double ownOpacity(const std::shared_ptr<LightNode> &node, const ShadowView &animatedView) const;
  void applyContentOpacity(
      const std::shared_ptr<LightNode> &child,
      double fromContentOpacity,
      double toContentOpacity,
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;
  std::vector<SharedTransitionRun *> contentFadeRuns() const;
  void composeCarrierContent(ShadowViewMutationList &filteredMutations, const PropsParserContext &propsParserContext)
      const;
  void restoreFadedChildren(
      ContentFade &contentFade,
      const std::vector<std::shared_ptr<LightNode>> &keptChildren,
      const std::unordered_set<Tag> &hiddenTags,
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;
  void holdTargetEntering(TransactionMeta &transaction, const PropsParserContext &propsParserContext) const;
  std::unordered_set<std::shared_ptr<LightNode>> fadingTargetContent() const;
  void startHeldEntering(
      const PendingNodeAnimation &held,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
  void fadeInTargetContent(
      const SharedTransitionRun &run,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
  void startProgressTransition(
      const std::shared_ptr<LightNode> &carrier,
      const ShadowView &before,
      const ShadowView &after,
      const Props::Shared &frameProps,
      const std::shared_ptr<Serializable> &config) const;
  void applyProgressAnimations();
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
  void releaseUnmappedContentFadeConfigs() const;

  bool mayChangeActiveBoundary(const ShadowViewMutation &mutation) const;
  void updateLightTree(
      const PropsParserContext &propsParserContext,
      ShadowViewMutationList &mutations,
      TransactionMeta &transaction) const;

  std::optional<ShadowView>
  reparentLayoutAnimation(Tag tag, Tag parentTag, const ShadowView &newView, react::Point offset) const;
  const ShadowView &mountedView(const std::shared_ptr<LightNode> &node) const;

  void applyInitialMutationsToLightTree(const ShadowViewMutationList &mutations) const;
  void updateLightNodeProps(
      const std::shared_ptr<LightNode> &node,
      const ShadowView &oldView,
      const ShadowView &newView) const;
  void resolveLightNodeProps(const std::shared_ptr<LightNode> &node) const;
  void releaseDroppedViews() const;
  void initializeLightTree(const ShadowTreeRevision &baseRevision);
  bool isLightTreeInitialized() const {
    return lightNodes_.contains(surfaceId_);
  }

  void applySynchronousProps(const UpdatesBatch &updatesBatch, bool trackInLightTree) const override;
  void composeSynchronousProps(UpdatesBatch &updatesBatch) const override;

  void reconcileContradictedRemovals(
      ShadowViewMutationList &mutations,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
#ifdef ANDROID
  ShadowView resetPropsMissingFrom(
      const ShadowView &view,
      const ShadowView &mounted,
      const PropsParserContext &propsParserContext) const;
#endif

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
  void eraseFinishedSharedTransitionRuns() const;
  void cleanupSharedTransitions(TransactionMeta &transaction, const PropsParserContext &propsParserContext) const;
#ifdef ANDROID
  bool hasPendingStructuralCleanup() const;
  bool isCarrierOfUncoveredRun(Tag tag, const std::vector<std::shared_ptr<LightNode>> &coveringViews) const;
  void maybeScheduleCleanupPull(bool flushedStructuralMutations) const;
  void holdFramesUntilBatchIsQueued(const ShadowViewMutationList &mutations) const;
  void releaseFramesOfQueuedBatch(const std::vector<Tag> &tags) const;
  bool defersLayoutAnimationStart(Tag tag) const override;
  void keepCarriersDetachedUntilFramesAreQueued(const ShadowViewMutationList &mutations) const;
  void releaseCarriersOfQueuedFrames(const std::vector<Tag> &tags) const;
#endif

  void hideTransitioningViews(
      BeforeOrAfter index,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;

  void keepTransitioningViewsHidden(
      ShadowViewMutationList &filteredMutations,
      const PropsParserContext &propsParserContext) const;
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) const override;
  void startSurface(
      const facebook::react::ShadowTree &shadowTree,
      std::weak_ptr<const facebook::react::MountingOverrideDelegate> mountingOverrideDelegate) override;
  std::optional<SurfaceId> onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) override;
  std::optional<SurfaceId> onGestureCancel(int tag) override;
  void onSharedTransitionConfigured(const std::vector<Tag> &viewTags) override;
  bool deferSharedTransitionConfigRelease(Tag tag) override;
  void updateVisibleScreens(int tag, double progress, bool isClosing) const;
  void markScreenVisible(int tag) const;
  bool isUncommittedScreenPopSource(int tag) const;
  std::optional<SurfaceId> cancelUncommittedScreenPop() const;
  void shadowTreeWillCommit(bool isSurfaceRemoval) override;
  void clearSurfaceState() const override;

  std::shared_ptr<LightNode> findActiveBoundary(const std::shared_ptr<LightNode> &node) const;
  std::shared_ptr<LightNode> findBoundaryGuess(const std::shared_ptr<LightNode> &node) const;

  void findSharedElementsOnScreen(
      const std::shared_ptr<LightNode> &node,
      BeforeOrAfter index,
      TransactionMeta &transaction) const;

  void detachCarrier(
      SharedTransitionRun &run,
      const ShadowView &startView,
      bool nested,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
  bool canDetachBeforeScreenSnapshot(const std::shared_ptr<LightNode> &node, const TransactionMeta &transaction) const;
  void attachCarrier(
      SharedTransitionRun &run,
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;
  void retainRemovedCarriers(const std::shared_ptr<LightNode> &node, TransactionMeta &transaction) const;
  void retainCarrierContent(const std::shared_ptr<LightNode> &node) const;
  bool isRetainedContent(const std::shared_ptr<LightNode> &node) const;
  bool defersSubtreeRemoval(const std::shared_ptr<LightNode> &node) const;
  void flushSubtreeRemovals(TransactionMeta &transaction) const;
  void scheduleTransitionLifecycleCleanup() const;
  std::shared_ptr<LightNode> detachedCarrierOf(const std::shared_ptr<LightNode> &node) const;
  std::shared_ptr<LightNode> carrierAncestorOf(const std::shared_ptr<LightNode> &node) const;
  bool isCarriedBy(const std::shared_ptr<LightNode> &carrier, const std::shared_ptr<LightNode> &ancestor) const;
  void moveNestedCarriersOutOf(const std::shared_ptr<LightNode> &node, TransactionMeta &transaction) const;
  bool keepsNesting(const std::shared_ptr<LightNode> &carrier, const std::shared_ptr<LightNode> &target) const;
  void moveNestedCarrierToRoot(
      SharedTransitionRun &run,
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext) const;
  react::Point carriedDistance(const std::shared_ptr<LightNode> &carrier) const;
  ShadowView movedCarrierTarget(Tag tag, react::Point offset) const;
  ShadowView inParentSpace(const ShadowView &snapshot, const std::shared_ptr<LightNode> &node) const;
  react::Point originOnScreen(const std::shared_ptr<LightNode> &node) const;
  Tag carrierParentTag(const std::shared_ptr<LightNode> &carrier) const;
  ShadowView targetInCarrierSpace(
      const SharedTransitionRun &run,
      const ShadowView &target,
      const PropsParserContext &propsParserContext) const;
  std::optional<Transform> transformsAboveNestedCarrier(
      const std::shared_ptr<LightNode> &carrier,
      const std::shared_ptr<LightNode> &ancestor,
      const ShadowView &view) const;
  react::Point positionIn(
      const std::shared_ptr<LightNode> &node,
      const std::shared_ptr<LightNode> &ancestor,
      bool useViewsOnScreen) const;
  bool isRetiringContent(Tag tag) const;
  void retireOrphanedSharedTransitions() const;
  void finishCoveredSharedTransitions(
      const std::shared_ptr<LightNode> &topScreen,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
  void retireSharedTransition(SharedTransitionRun &run) const;
  void finishRetiringSharedTransitions(
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext,
      bool flushStructuralMutations) const;
  void removeFromParent(
      const std::shared_ptr<LightNode> &node,
      ShadowViewMutationList &mutations,
      ShadowViewMutationList &rootMutations) const;
  int carrierHostIndex(const std::shared_ptr<LightNode> &node) const;
  Tag carrierHostTag() const;
  void ensureCarrierOverlay(ShadowViewMutationList &mutations, const PropsParserContext &propsParserContext) const;
  bool isOffWindow(const std::shared_ptr<LightNode> &node) const;
  void endSharedTransitionOf(
      const SharedTag &sharedTag,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
  ShadowView targetOnScreen(const SharedTransitionRun &run, const PropsParserContext &propsParserContext) const;
  void followOffWindowTargets(const PropsParserContext &propsParserContext) const;
  void followProgressTargets(const PropsParserContext &propsParserContext) const;
  const LayoutAnimation &carrierAnimation(const SharedTransitionRun &run) const;
  const ShadowView &carrierViewOnScreen(const SharedTransitionRun &run) const;
  SharedTransitionRun *runOfCarrier(const std::shared_ptr<LightNode> &node) const;
  SharedTransitionRun *activeSharedTransitionRun(const SharedTag &sharedTag) const;
  SharedTransitionRun *sharedTransitionRun(Tag carrierTag, SharedTransitionLifecycle lifecycle) const;
  // A loop over this view must not change the lifecycle of a run.
  auto activeSharedTransitionRuns() const {
    return sharedTransitionRuns_ | std::views::values | std::views::filter([](const SharedTransitionRun &run) {
             return run.lifecycle == SharedTransitionLifecycle::ACTIVE;
           });
  }
  ShadowView asCarrierView(
      const ShadowView &view,
      const std::shared_ptr<LightNode> &carrier,
      const PropsParserContext &propsParserContext) const;
  bool targetEndChanged(const SharedTransitionRun &run, const ShadowView &carrierTarget) const;
  ShadowView ownCarrierView(
      const ShadowView &view,
      const std::shared_ptr<LightNode> &carrier,
      const PropsParserContext &propsParserContext) const;
  ShadowView carrierViewWithStyleOf(
      const ShadowView &source,
      const std::shared_ptr<LightNode> &carrier,
      const PropsParserContext &propsParserContext) const;
  bool endsPathOnScreen(
      const std::shared_ptr<LightNode> &pathNode,
      const std::shared_ptr<LightNode> &node,
      bool useViewsOnScreen) const;
  const ShadowView &pathView(
      const std::shared_ptr<LightNode> &pathNode,
      const std::shared_ptr<LightNode> &node,
      bool useViewsOnScreen) const;

  SharedTransitionRun &startSharedTransitionRun(
      const ShadowView &before,
      const SharedTag &sharedTag,
      const std::array<std::shared_ptr<LightNode>, 2> &nodes,
      const std::shared_ptr<Serializable> &config,
      SharedTransitionDriver driver,
      const std::optional<SharedTransitionContentFade> &contentFade,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
  void finishEndedSharedTransitions(
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext,
      bool flushStructuralMutations,
      std::unordered_set<Tag> &preservedTags) const;
  LandingBlocker landingBlocker(
      const SharedTransitionRun &run,
      bool flushStructuralMutations,
      const std::vector<std::shared_ptr<LightNode>> &coveringViews) const;
  bool waitsForCoveringRun(const SharedTransitionRun &run, const std::vector<std::shared_ptr<LightNode>> &coveringViews)
      const;
  bool runContinues(Tag carrierTag) const;
  bool landsWithOtherRuns(const SharedTransitionRun &run) const;
  std::vector<std::shared_ptr<LightNode>> viewsHiddenByContinuingRuns() const;
  void finishSharedTransition(
      SharedTransitionRun &run,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext,
      bool landed = false) const;
  void finishNestedSharedTransitions(
      const std::shared_ptr<LightNode> &carrier,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext,
      bool landed) const;
  bool hasUnqueuedCarrierFrame(Tag tag) const;
  std::optional<SharedTag> findSharedTag(const ShadowView &view) const;
  void hideInSharedElement(const SharedTag &sharedTag, const std::shared_ptr<LightNode> &node) const;
  RestoreRequest withShownEndpoint(const RestoreRequest &request) const;
  bool showHiddenView(const RestoreRequest &request) const;
  void deferRestore(const RestoreRequest &request) const;
  void forgetHiddenView(Tag tag) const;
  std::unordered_set<Tag> hiddenViewTags() const;
  std::unordered_set<Tag> viewTagsKeptHidden() const;
  void queuePendingRestores(TransactionMeta &transaction) const;
  bool isInSharedTransition(const std::shared_ptr<LightNode> &node) const;

  std::vector<react::Point> getAbsolutePositionsForRootPathView(
      const std::shared_ptr<LightNode> &node,
      bool useViewsOnScreen) const;
  std::vector<Ancestor> collectAncestors(const std::shared_ptr<LightNode> &node, bool useViewsOnScreen) const;
  std::optional<AncestorOutsideReactParent> findAncestorOutsideReactParent(
      const std::vector<Ancestor> &ancestors,
      bool settled) const;
  void adjustForNativePlacement(CollectedTransition &collectedTransition, BeforeOrAfter index) const;
  void adjustForNativePlacement(CollectedTransitions &transitions) const;
  const ShadowView &viewOnScreen(const std::shared_ptr<LightNode> &node) const;

  void overrideTransform(
      ShadowView &shadowView,
      const std::optional<Transform> &transform,
      const PropsParserContext &propsParserContext) const;

  std::optional<Transform> parseParentTransforms(
      const std::vector<Ancestor> &ancestors,
      const std::vector<react::Point> &absolutePositions) const;
  react::Transform resolveTransform(
      const react::Size &originFrameSize,
      const react::Size &ownSize,
      const Transform &transform,
      const TransformOrigin &transformOrigin) const;
  std::array<float, 3>
  getTranslateForTransformOrigin(float viewWidth, float viewHeight, const TransformOrigin &transformOrigin) const;

  void handleSubtreeRemoval(const std::shared_ptr<LightNode> &node, TransactionMeta &transaction) const;
  bool holdsSnapshottedScreen(const std::shared_ptr<LightNode> &node) const;
#ifdef __APPLE__
  bool holdsSourceInModal(const std::shared_ptr<LightNode> &node, const TransactionMeta &transaction) const;
#endif
  void collectDueRemovals(TransactionMeta &transaction) const;
  void tearDown(const std::unordered_set<Tag> &removals, ShadowViewMutationList &mutations) const;

  void addOngoingAnimations(TransactionMeta &transaction) const;
  ShadowView cloneViewWithoutOpacity(const ShadowView &shadowView, const PropsParserContext &propsParserContext) const;

  bool planSubtreeRemoval(
      const std::shared_ptr<LightNode> &node,
      TransactionMeta &transaction,
      SubtreeRemovalConfig config,
      std::vector<std::shared_ptr<LightNode>> &removals) const;
  void endAnimationsRecursively(
      const std::shared_ptr<LightNode> &node,
      ShadowViewMutationList &mutations,
      ShadowViewMutationList &rootMutations,
      bool removeBeforeChildren = false) const;

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
