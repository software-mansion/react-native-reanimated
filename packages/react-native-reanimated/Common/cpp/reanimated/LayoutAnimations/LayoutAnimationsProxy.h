#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/NativeLayoutGroups.h>
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
  bool defersTeardown;
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
  /// The views that the transaction inserts.
  std::unordered_set<Tag> insertedTags;
  /// The views that a shared transition hides in the transaction.
  std::vector<Tag> hiddenTags;
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
  // screens that forceScreenSnapshot_ switched to snapshots after updates; React Native Screens never switches them
  // back
  mutable std::unordered_set<Tag> snapshottedScreens_;
  mutable std::unordered_map<Tag, SharedContainer> sharedContainers_;
  mutable std::unordered_set<Tag> hiddenViewTags_;
  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  mutable std::unordered_map<Tag, std::shared_ptr<LightNode>> lightNodes_;
  /// The nodes whose exiting animation ended. The next pull that can remove views removes those that still
  /// have the state `COMPLETED`.
  mutable std::vector<std::shared_ptr<LightNode>> completedExits_;
  mutable std::vector<std::pair<ShadowTreeRevision::Number, ShadowViewMutationList>> pendingTransactions_;
  mutable bool surfaceToRemove_ = false;
#ifdef ANDROID
  mutable bool cleanupPullScheduled_ = false;
#endif

#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshot_;
#endif
  mutable StaleSynchronousPropsTracker staleSynchronousProps_;
  const std::shared_ptr<native_animation::NativeAnimationHost> nativeAnimationHost_;
  /// Null when layout animations have no native route, and before the start of the surface.
  std::shared_ptr<NativeLayoutGroups> nativeLayoutGroups_;
  /// The native starts of the last pull. The mount report of that transaction takes them.
  mutable std::vector<native_animation::MountedStart> pendingNativeStarts_;
  /// The build ends that the pull gives to the UI runtime before it returns.
  mutable NativeLayoutBuildEnds pendingNativeBuildEnds_;
#ifndef NDEBUG
  mutable MountingTransaction::Number pulledTransactionNumber_ = 0;
  /// The native tracks of each view that no frame-driven update changed after their start.
  mutable std::unordered_map<Tag, std::vector<native_animation::TrackKey>> nativeTracksWithoutFrameUpdate_;
  mutable std::vector<native_animation::TrackKey> pulledFirstFrameUpdates_;
#endif
  void warnAboutStaleSynchronousProps(Tag tag, Tag staleTag, LayoutAnimationType type) const;
  void warnIfSnapshotIsStale(const ShadowView &snapshot, const TransactionMeta &transaction) const;

  LayoutAnimationsProxy(SurfaceId surfaceId, const LayoutAnimationsProxyDependencies &dependencies);

  void startEnteringAnimation(
      const std::shared_ptr<LightNode> &node,
      const std::shared_ptr<Serializable> &config,
      TransactionMeta &transaction,
      const PropsParserContext &propsParserContext) const;
  void startExitingAnimation(const std::shared_ptr<LightNode> &node, const std::shared_ptr<Serializable> &config) const;
  void startLayoutAnimation(
      const std::shared_ptr<LightNode> &node,
      const std::shared_ptr<Serializable> &config,
      TransactionMeta &transaction) const;
  /// True when a start of type `type` on the view can ask for native playback. A view with a frame-driven
  /// animation stays frame-driven until that animation ends. A view that React removed admits only the start
  /// of its exiting animation, so no later request starts on it. A view that a shared transition hides admits
  /// no start: a native opacity track shows the view.
  bool admitsNativeStart(const std::shared_ptr<LightNode> &node, LayoutAnimationType type) const;
  /// True when the entering start of a view that the transaction inserts can ask for native playback: the view
  /// admits a native start, and the mount of the transaction puts it in a window. UI thread only.
  bool admitsNativeEnteringStart(const std::shared_ptr<LightNode> &node, const TransactionMeta &transaction) const;
  /// True when each ancestor of the view that the transaction inserts is a plain `View`, the view of the
  /// nearest other ancestor is in a window, and none of these ancestors removes its clipped subviews. UI thread
  /// only.
  bool mountsInWindow(const std::shared_ptr<LightNode> &node, const TransactionMeta &transaction) const;
  /// True when the native host plays the whole animation of `start`. The request then starts after the mount
  /// of this transaction, which must leave the view in the state `start.after`. Else the UI runtime holds the
  /// result of the builder under the build of `start`. UI thread only.
  bool startNativePlayback(ManagedLayoutAnimationStart &start) const;
  /// Runs the builder of `start` one time with the values that the view shows, and keeps the result on the UI
  /// runtime under the build of `start`. Gives the summary of the result. UI thread only.
  jsi::Value buildLayoutAnimation(ManagedLayoutAnimationStart &start) const;
  /// Gives the view of `start` to the frame driver: the start gets the live leaves of the view, and the native
  /// playback of the view ends. UI thread only when the view has live leaves.
  void continueOnFrameDriver(ManagedLayoutAnimationStart &start) const;
  /// Ends the native playback of the view. Its group gets `false`.
  void cancelNativeLayoutAnimation(Tag tag) const;
  /// Gives the layout animation of a view that a shared transition hides to the frame driver when the view
  /// has a native opacity track. That track shows the view until it ends; a group with no opacity track
  /// continues on the hidden view.
  void hideNativeOpacityAnimation(Tag tag) const;
  void flushNativeBuildEnds() const;
  /// Gives the callbacks and the releases of `buildEnds` to the UI runtime. A view whose exiting animation
  /// got its result leaves in the next pull. An end with a handover gets no result when the frame driver takes
  /// its build. UI thread only.
  void endNativeBuilds(NativeLayoutBuildEnds buildEnds) const;
  /// Enqueues the frame-driven start of the build of `buildEnd` when the end has a handover and layout still
  /// keeps the view. The build then plays on its own timeline from its origin and its callback stays open.
  /// False when the end applies.
  bool transferToFrameDriver(const NativeLayoutBuildEnd &buildEnd) const;
  void completeNativeExits(const NativeLayoutBuildEnds &buildEnds) const;
  /// The config of the layout animation that runs on the view, on the frame driver or natively.
  std::shared_ptr<Serializable> runningLayoutAnimationConfig(Tag tag) const;
  /// The update that brings the host view to the final state of `node`.
  ShadowViewMutation updateToMount(const ShadowViewMutation &mutation, const std::shared_ptr<LightNode> &node) const;
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
  void surfaceDidMount() override;
#ifndef NDEBUG
  /// Records the native tracks of the view whose target this frame-driven update changes first.
  void traceFirstFrameUpdates(const ShadowView &currentView, const ShadowView &newView) const;
#endif
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
  /// The view on screen with the values that its live native tracks show. UI thread only. The capture runs
  /// only animation code of the library, so the caller can hold the config lock.
  ShadowView shownView(const std::shared_ptr<LightNode> &node) const;
  /// `mounted` with the values that the live native tracks of the view show at the time of this batch.
  /// UI thread only.
  ShadowView viewWithLiveLeafValues(const ShadowView &mounted, const LiveLayoutLeaves &liveLeaves) const;

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
  bool holdsSnapshottedScreen(const std::shared_ptr<LightNode> &node) const;
  void completeExit(const std::shared_ptr<LightNode> &node) const;
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
