#include <react/renderer/components/view/ViewShadowNode.h>
#include <react/renderer/mounting/Differentiator.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <reanimated/Compat/ReactNativeDebug.h>
#include <reanimated/Compat/ReactNativeFeatureFlagsCompat.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>
#include <reanimated/LayoutAnimations/NativeLayoutRoute.h>
#include <reanimated/LayoutAnimations/NativeLayoutTracks.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <worklets/Compat/StableApi.h>

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <cstring>
#include <iterator>
#include <memory>
#include <optional>
#include <ranges>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {
using enum LayoutAnimationType;
using enum ExitingState;

namespace {
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
std::string_view toString(const LayoutAnimationType type) {
  switch (type) {
    case ENTERING:
      return "Entering";
    case EXITING:
      return "Exiting";
    case LAYOUT:
      return "Layout";
    case SHARED_ELEMENT_TRANSITION:
      return "SharedElementTransition";
    case SHARED_ELEMENT_TRANSITION_NATIVE_ID:
      return "SharedElementTransitionNativeID";
    case SHARED_ELEMENT_TRANSITION_PROGRESS:
      return "SharedElementTransitionProgress";
    case SHARED_ELEMENT_TRANSITION_PROGRESS_NATIVE_ID:
      return "SharedElementTransitionProgressNativeID";
  }
}

/// The Debug trace of one mount report: the mounted first frame updates and starts of each pull when the
/// report begins, and `LayoutMountReported` for each pull when it ends, in pull order.
class MountReportTrace final {
 public:
  MountReportTrace(
      native_animation::TraceRecorder &trace,
      const SurfaceId surfaceId,
      const std::vector<PullRecord> &pulls)
      : trace_(trace), surfaceId_(surfaceId) {
    for (const auto &pull : pulls) {
      for (const auto &track : pull.firstFrameUpdates) {
        trace_.record(
            {.event = native_animation::TraceEventType::FrameUpdateMounted,
             .handle = track.handle,
             .target = track.target,
             .objective = 7,
             .transactionNumber = pull.transactionNumber});
      }
      for (const auto &operation : pull.operations) {
        if (const auto *start = std::get_if<native_animation::MountedStart>(&operation)) {
          trace_.record(
              {.event = native_animation::TraceEventType::LayoutStartMounted,
               .handle = start->request.handle,
               .objective = 7,
               .transactionNumber = pull.transactionNumber});
        }
      }
      reportedTransactions_.push_back(pull.transactionNumber);
    }
  }
  ~MountReportTrace() {
    for (const auto transactionNumber : reportedTransactions_) {
      trace_.record(
          {.event = native_animation::TraceEventType::LayoutMountReported,
           .handle = {.surfaceId = surfaceId_},
           .objective = 12,
           .transactionNumber = transactionNumber});
    }
  }
  MountReportTrace(const MountReportTrace &) = delete;
  MountReportTrace &operator=(const MountReportTrace &) = delete;

 private:
  native_animation::TraceRecorder &trace_;
  const SurfaceId surfaceId_;
  std::vector<MountingTransaction::Number> reportedTransactions_;
};
#endif

struct AncestorOrigin {
  Tag tag;
  react::Point origin;
};

react::Point reparentOffset(const std::vector<AncestorOrigin> &oldChain, const std::vector<AncestorOrigin> &newChain) {
  react::Point newOffset;
  for (const auto &newAncestor : newChain) {
    react::Point oldOffset;
    for (const auto &oldAncestor : oldChain) {
      if (oldAncestor.tag == newAncestor.tag) {
        return oldOffset - newOffset;
      }
      oldOffset += oldAncestor.origin;
    }
    newOffset += newAncestor.origin;
  }
  return {};
}

std::vector<AncestorOrigin> ancestorOrigins(
    std::shared_ptr<LightNode> node,
    const std::unordered_map<Tag, ShadowView> &updatedViews) {
  std::vector<AncestorOrigin> chain;
  for (; node; node = node->parent.lock()) {
    const auto updatedIt = updatedViews.find(node->current.tag);
    const auto &view = updatedIt == updatedViews.end() ? node->current : updatedIt->second;
    chain.push_back({node->current.tag, view.layoutMetrics.frame.origin});
  }
  return chain;
}

void collectSubtreeTags(const std::shared_ptr<LightNode> &node, std::unordered_set<Tag> &tags) {
  if (!tags.insert(node->current.tag).second) {
    return;
  }
  for (const auto &child : node->children) {
    collectSubtreeTags(child, tags);
  }
}

// Every exiting ancestor that the removals leave without children.
void collectDroppedAncestors(const std::shared_ptr<LightNode> &node, std::unordered_set<Tag> &removals) {
  if (isInRetainedCarrier(node)) {
    return;
  }
  for (auto ancestor = node->parent.lock(); ancestor && ancestor->isExiting() && ancestor->state != ANIMATING;
       ancestor = ancestor->parent.lock()) {
    const auto tag = ancestor->current.tag;
    const auto keepsAChild = std::ranges::any_of(
        ancestor->children, [&removals](const auto &child) { return !removals.contains(child->current.tag); });
    if (removals.contains(tag) || keepsAChild) {
      return;
    }
    removals.insert(tag);
  }
}

// The subtrees of the roots and the ancestors that they drop.
std::unordered_set<Tag> collectRemovals(const std::vector<std::shared_ptr<LightNode>> &roots) {
  std::unordered_set<Tag> removals;
  for (const auto &root : roots) {
    collectSubtreeTags(root, removals);
  }
  for (const auto &root : roots) {
    collectDroppedAncestors(root, removals);
  }
  return removals;
}
} // namespace

namespace {
void deliverNativeBuildEnds(
    LayoutAnimationsManager &layoutAnimationsManager,
    jsi::Runtime &uiRuntime,
    const NativeLayoutBuildEnds &buildEnds) {
  for (const auto &buildEnd : buildEnds) {
    if (buildEnd.callbackResult) {
      layoutAnimationsManager.finishBuiltLayoutAnimation(uiRuntime, buildEnd.buildId, *buildEnd.callbackResult);
    }
    if (buildEnd.isReleased) {
      layoutAnimationsManager.releaseBuiltLayoutAnimation(uiRuntime, buildEnd.buildId);
    }
  }
}

/// React Native puts a child of such a view in the view tree only while the child is in the clip rectangle.
bool removesClippedSubviews(const ShadowView &view) {
  return isViewKind(view) && getViewProps(view).removeClippedSubviews;
}

/// A build id is also the generation of the native command of the build, and the UI runtime keeps the
/// builds of all surfaces in one map.
uint64_t makeBuildId() {
  static std::atomic<uint64_t> lastBuildId{0};
  return ++lastBuildId;
}
} // namespace

std::shared_ptr<LayoutAnimationsProxyRegistry> createLayoutAnimationsProxyDefaultRegistry(
    const LayoutAnimationsProxyDependencies &dependencies) {
  return std::make_shared<LayoutAnimationsProxyRegistry>(
      [dependencies](const SurfaceId surfaceId) -> std::shared_ptr<LayoutAnimationsProxyCommon> {
        return std::make_shared<LayoutAnimationsProxy>(surfaceId, dependencies);
      });
}

LayoutAnimationsProxy::LayoutAnimationsProxy(
    const SurfaceId surfaceId,
    const LayoutAnimationsProxyDependencies &dependencies)
    : LayoutAnimationsProxyCommon(surfaceId, dependencies),
      sharedTransitionManager_(dependencies.layoutAnimationsManager->getSharedTransitionManager()),
      uiRuntimeWeak_(dependencies.uiRuntimeWeak),
      scheduleOnNextUIFrame_(dependencies.scheduleOnNextUIFrame),
      nativeAnimationHost_(hasNativeLayoutRouteFlag() ? dependencies.nativeAnimationHost : nullptr) {
#ifdef __APPLE__
  forceScreenSnapshot_ = dependencies.forceScreenSnapshot;
  setSharedTransitionOverlay_ = dependencies.setSharedTransitionOverlay;
  nativeViewPlacement_ = dependencies.nativeViewPlacement;
  isMovedByContainerTransition_ = dependencies.isMovedByContainerTransition;
#endif
#ifdef ANDROID
  releaseViewTransitions_ = dependencies.releaseViewTransitions;
#endif
}

void LayoutAnimationsProxy::warnAboutStaleSynchronousProps(
    const Tag tag,
    const Tag staleTag,
    const LayoutAnimationType type) const {
  const auto message = staleSynchronousProps_.takeWarning(tag, staleTag, type);
  if (!message) {
    return;
  }
  scheduleOnUI(uiScheduler_, [&uiRuntime = uiRuntime_, message = *message]() {
    const auto consoleWarn =
        uiRuntime.global().getPropertyAsObject(uiRuntime, "console").getPropertyAsFunction(uiRuntime, "warn");
    consoleWarn.call(uiRuntime, message);
  });
}

void LayoutAnimationsProxy::warnIfSnapshotIsStale(const ShadowView &snapshot, const TransactionMeta &transaction)
    const {
  const auto it = transaction.staleSnapshots.find(snapshot.tag);
  if (it != transaction.staleSnapshots.end()) {
    warnAboutStaleSynchronousProps(snapshot.tag, it->second, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
  }
}

// A layout animation sends its frames to the platform as Updates from its current view.
const ShadowView &LayoutAnimationsProxy::mountedView(const std::shared_ptr<LightNode> &node) const {
  const auto tag = node->current.tag;
  if (const auto animationIt = layoutAnimations_.find(tag); animationIt != layoutAnimations_.end()) {
    return currentViewOf(animationIt->second);
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end()) {
    return currentViewOf(completedAnimationIt->second);
  }
  if (node->exitedAnimation) {
    return currentViewOf(*node->exitedAnimation);
  }
  resolveLightNodeProps(node);
  return node->current;
}

std::optional<ShadowView> LayoutAnimationsProxy::reparentLayoutAnimation(
    const Tag tag,
    const Tag parentTag,
    const ShadowView &newView,
    const react::Point offset) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto pendingCurrentView = reparentPendingLayoutAnimations(tag, parentTag, newView, offset);
  if (const auto animationIt = layoutAnimations_.find(tag); animationIt != layoutAnimations_.end()) {
    auto &animation = animationIt->second;
    animation.parentTag = parentTag;
    animation.currentView.layoutMetrics.frame.origin += offset;
    animation.startView.layoutMetrics.frame.origin += offset;
    moveLayoutAnimationTarget(tag, animation, newView, offset);
    return currentViewOf(animation);
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end()) {
    auto &animation = completedAnimationIt->second;
    animation.parentTag = parentTag;
    animation.currentView.layoutMetrics.frame.origin += offset;
    if (animation.geometryProgress) {
      animation.startView.layoutMetrics.frame.origin += offset;
    }
    moveLayoutAnimationTarget(tag, animation, newView, offset);
    return currentViewOf(animation);
  }
  return pendingCurrentView;
}

// A frame that waits for a pull keeps its place on screen.
void LayoutAnimationsProxy::moveLayoutAnimationTarget(
    const Tag tag,
    LayoutAnimation &animation,
    const ShadowView &newView,
    const react::Point offset) const {
  if (!animation.geometryProgress) {
    if (animation.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS) {
      animation.frameOffset += offset;
    }
    animation.finalView = newView;
    return;
  }
  animation.finalView.layoutMetrics = newView.layoutMetrics;
  if (const auto pending = updateMap_.find(tag); pending != updateMap_.end()) {
    auto &frame = pending->second.frame;
    if (frame.x) {
      *frame.x += offset.x;
    }
    if (frame.y) {
      *frame.y += offset.y;
    }
  }
}

// MARK: MountingOverrideDelegate

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
  ReanimatedSystraceSection d("pullTransaction");
  const LayoutAnimationsPull pull;
  react_native_assert(surfaceId == surfaceId_ && "pull routed to the wrong surface's proxy");
  assertUpdatesRegistryUnlocked();
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  currentPull_ = {};
  currentPull_.mountReport = mountReportOfPull();
  react_native_assert(
      std::ranges::all_of(
          pendingPulls_,
          [this](const PullRecord &pull) {
            return pull.mountReport.has_value() && pull.mountReport == currentPull_.mountReport;
          }) &&
      "a pull came after a pull of another mount report that no report drained");
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  currentPull_.transactionNumber = transactionNumber;
#endif
  auto configLock = layoutAnimationsManager_->lockAndFlushConfigUpdates();
  if (!isLightTreeInitialized()) {
    pendingTransactions_.emplace_back(telemetry.getRevisionNumber(), mutations);
    return MountingTransaction{surfaceId, transactionNumber, std::move(mutations), telemetry};
  }
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  TransactionMeta transaction;
  const bool removesRootChildren = std::ranges::any_of(mutations, [this](const auto &mutation) {
    return mutation.type == ShadowViewMutation::Remove && mutation.parentTag == surfaceId_;
  });
  if (removesRootChildren) {
    transaction.surfaceDropped = std::exchange(surfaceToRemove_, false);
  }
  auto &filteredMutations = transaction.filteredMutations;
  const bool flushStructuralMutations = shouldFlushStructuralMutations();
  const bool commits = !mutations.empty();

  reconcileContradictedRemovals(mutations, transaction, propsParserContext);

  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (!mutations.empty()) {
      updateLightTree(propsParserContext, mutations, transaction);
    }
  } else if (transition_ || uncommittedScreenPop_) {
    updateLightTree(propsParserContext, mutations, transaction);
    resolveTransitionLifecycle(transaction, mutations, propsParserContext);
    hideInsertedSharedViewsBesideTheirTag(transaction, propsParserContext);
    if (transition_ && !mutations.empty()) {
      followProgressTargets(propsParserContext);
    }
    activeBoundaryMayHaveChanged_ = true;
  } else if (!mutations.empty()) {
    auto root = lightNodes_[surfaceId_];
    react_native_assert(root && "Root node not found");
    activeBoundaryMayHaveChanged_ = activeBoundaryMayHaveChanged_ ||
        std::ranges::any_of(mutations, [this](const auto &mutation) { return mayChangeActiveBoundary(mutation); });
    const auto snapshotTags =
        activeBoundaryMayHaveChanged_ || !topScreen_ ? std::nullopt : sharedTagsAffectedBy(mutations);
    auto beforeTopScreen = topScreen_;
    if (beforeTopScreen) {
      ReanimatedSystraceSection s("find before elements");
      findSharedElements(beforeTopScreen, BEFORE, snapshotTags, transaction);
    }

    updateLightTree(propsParserContext, mutations, transaction);

    react_native_assert(
        (activeBoundaryMayHaveChanged_ || (boundaries_.empty() && !topScreen_) ||
         findActiveBoundary(root) == topScreen_) &&
        "Active boundary changed without setting activeBoundaryMayHaveChanged_");
    react_native_assert(
        (!snapshotTags || !activeBoundaryMayHaveChanged_) && "The light tree update changed the active boundary");
    auto afterTopScreen = activeBoundaryMayHaveChanged_ ? findActiveBoundary(root) : topScreen_;
    activeBoundaryMayHaveChanged_ = false;
    rememberCoveredTopBoundary(beforeTopScreen, afterTopScreen);
    topScreen_ = afterTopScreen;
    hideInsertedSharedViewsBesideTheirTag(transaction, propsParserContext);
    if (afterTopScreen) {
      {
        ReanimatedSystraceSection s("find after elements");
        findSharedElements(afterTopScreen, AFTER, snapshotTags, transaction);
      }
#ifdef __APPLE__
      // TODO (future): this is a temporary workaround for RNScreens on iOS,
      // which takes the snapshot of the popped screen before we hide the
      // shared element, the issue should be gone with the new stack
      // implementation. A modal can hold a nested stack, so the popped screen
      // is the first one with a screen below it.
      for (auto screen = findParentRNSScreen(afterTopScreen); screen; screen = findParentRNSScreen(screen)) {
        if (forceScreenSnapshot_(screen->current.tag)) {
          snapshottedScreens_.insert(screen->current.tag);
        }
        if (findScreenBelow(screen)) {
          break;
        }
      }
#endif
    }
    const bool hasScreenChanged = beforeTopScreen && afterTopScreen && beforeTopScreen != afterTopScreen;

    handleSharedTransitionsStart(afterTopScreen, beforeTopScreen, transaction, mutations, propsParserContext);

    // The carriers stay visible, so the transitions choose them before the other views are hidden.
    if (hasScreenChanged) {
      hideTransitioningViews(BEFORE, transaction, propsParserContext);
      hideTransitioningViews(AFTER, transaction, propsParserContext);
    }
  }

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
#ifdef __APPLE__
    waitForContainerTransitions();
#endif
    followOffWindowTargets(transaction, propsParserContext);
    flushSubtreeRemovals(transaction);
    scheduleTransitionLifecycleCleanup();
    retireOrphanedSharedTransitions();
    holdTargetEntering(transaction, propsParserContext);
    prepareCarrierLayerInWindow(transaction, propsParserContext);
  }
  configLock.unlock();

  for (const auto &[node, config] : transaction.entering) {
    startEnteringAnimation(node, config, transaction, propsParserContext);
  }
  for (const auto &[node, config, before] : transaction.layout) {
    startLayoutAnimation(node, config, before, transaction);
  }
  for (const auto &[node, config] : transaction.exiting) {
    startExitingAnimation(node, config);
  }
  // After the starts: a start on a view that the transaction hides takes the live leaves of its native group.
  for (const auto tag : transaction.hiddenTags) {
    hideNativeOpacityAnimation(tag);
  }

  filteredMutations.insert(
      filteredMutations.end(), transaction.teardownMutations.begin(), transaction.teardownMutations.end());

  collectDueRemovals(transaction);
  if (flushStructuralMutations) {
    tearDown(transaction.dueRemovals, filteredMutations);
  }

  // The callback of a native group that a frame-driven start ends gets its result before that start.
  flushNativeBuildEnds();
  flushLayoutAnimationOperations(lock);

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (commits) {
      followSharedTransitionTargets(propsParserContext, false);
      moveWithScrolledTargets();
    }
  }
  addOngoingAnimations(transaction);

  cleanupAnimations(transaction, propsParserContext, flushStructuralMutations);

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    releaseUnmappedContentFadeConfigs();
  }

#ifdef ANDROID
  maybeScheduleCleanupPull(flushStructuralMutations);
#endif

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    composeCarrierContent(filteredMutations, propsParserContext);
    keepTransitioningViewsHidden(filteredMutations, propsParserContext);
  }

  react_native_assert(!deletesCreatedTag(filteredMutations) && "Transaction deletes a view that it creates");
#ifdef ANDROID
  releaseViewTransitionsOfMovedCarriers(filteredMutations);
  holdFramesUntilBatchIsQueued(filteredMutations);
  keepCarriersDetachedUntilFramesAreQueued(filteredMutations);
#endif
  eraseFinishedSharedTransitionRuns();
#ifdef ANDROID
  maybeStartCarrierRelease();
#endif
  flushNativeBuildEnds();

  if (!currentPull_.isEmpty()) {
    pendingPulls_.push_back(std::exchange(currentPull_, {}));
  }

  return MountingTransaction{surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

std::optional<std::uint64_t> LayoutAnimationsProxy::mountReportOfPull() const {
  return nativeAnimationHost_ && pullsOnMountThread() && worklets::isOnUIThread(uiScheduler_)
      ? nativeAnimationHost_->mountReportOfPull(surfaceId_)
      : std::nullopt;
}

bool PullRecord::isEmpty() const {
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  return operations.empty() && firstFrameUpdates.empty();
#else
  return operations.empty();
#endif
}

bool LayoutAnimationsProxy::isLightNodeMapped(const std::shared_ptr<LightNode> &node) const {
  if (!node) {
    return false;
  }
  const auto nodeIt = lightNodes_.find(node->current.tag);
  return nodeIt != lightNodes_.end() && nodeIt->second == node;
}

// the only erase of lightNodes_ once the tree is initialized
void LayoutAnimationsProxy::unmapLightNode(const std::shared_ptr<LightNode> &node) const {
  const auto it = lightNodes_.find(node->current.tag);
  if (it == lightNodes_.end() || it->second != node) {
    return;
  }
  react_native_assert(
      node->placement() != CarrierPlacement::AT_ROOT && "Remove the carrier from the root before unmapping its node");
  lightNodes_.erase(it);
  if (boundaries_.erase(node)) {
    activeBoundaryMayHaveChanged_ = true;
  }
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (sharedTransitionManager_->hasNames()) {
      unmappedContentFadeTags_.insert(node->current.tag);
    }
    if (deferredSharedTransitionConfigReleases_.erase(node->current.tag)) {
      layoutAnimationsManager_->clearSharedTransitionConfigs({node->current.tag});
    }
  }
  forgetHiddenView(node->current.tag);
  coveredTopBoundaries_.erase(node->current.tag);
  cancelNativeLayoutAnimation(node->current.tag);
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  nativeTracksWithoutFrameUpdate_.erase(node->current.tag);
#endif
  snapshottedScreens_.erase(node->current.tag);
  visibleScreens_.erase(node->current.tag);
  if (node == topScreen_) {
    topScreen_ = nullptr;
  }
  if (uncommittedScreenPop_ && node == uncommittedScreenPop_->sourceScreen) {
    uncommittedScreenPop_->sourceScreen = nullptr;
  }
  if (transition_ && (node == transition_->sourceScreen || node == transition_->targetScreen)) {
    transition_->state = TransitionState::CANCELLED;
    transition_->updated = true;
  }
}

void LayoutAnimationsProxy::releaseUnmappedContentFadeConfigs() const {
  for (const auto tag : unmappedContentFadeTags_) {
    if (!lightNodes_.contains(tag)) {
      layoutAnimationsManager_->clearSharedTransitionContentFade(tag);
    }
  }
  unmappedContentFadeTags_.clear();
}

// React re-creating a tag that the light tree still holds keeps its mounted view: the Create becomes an Update of it
// and the Delete is dropped, because Android mounts the Deletes of a transaction after its Creates. A live node
// is deleted in the same transaction, for example when React Native's LayoutAnimation flushes a Remove and Delete
// that it deferred.
void LayoutAnimationsProxy::reconcileContradictedRemovals(
    ShadowViewMutationList &mutations,
    TransactionMeta &transaction,
    [[maybe_unused]] const PropsParserContext &propsParserContext) const {
  auto &filteredMutations = transaction.filteredMutations;
  auto &recreatedTags = transaction.recreatedTags;
  std::unordered_set<Tag> deletedTags;
  for (const auto &mutation : mutations) {
    if (mutation.type == ShadowViewMutation::Type::Delete) {
      deletedTags.insert(mutation.oldChildShadowView.tag);
    }
  }
  std::vector<std::shared_ptr<LightNode>> withheldNodes;
  for (auto &mutation : mutations) {
    if (mutation.type != ShadowViewMutation::Type::Create) {
      continue;
    }
    const auto tag = mutation.newChildShadowView.tag;
    const auto it = lightNodes_.find(tag);
    if (it == lightNodes_.end() || (it->second->state == LIVE && !deletedTags.contains(tag))) {
      continue;
    }
    const auto &node = it->second;
    const auto parent = node->parent.lock();
    react_native_assert((parent || node->presence() == ReactPresence::REMOVED) && "Parent node is nullptr");
    recreatedTags.insert(tag);
    const bool isDetachedLiveNode = node->state == LIVE && node->placement() == CarrierPlacement::AT_ROOT;
    if (isDetachedLiveNode) {
      resolveLightNodeProps(node);
    }
    const auto &mounted = isDetachedLiveNode ? node->current : mountedView(node);
    auto recreated = mutation.newChildShadowView;
#ifdef ANDROID
    recreated = resetPropsMissingFrom(recreated, mounted, propsParserContext);
#endif
    auto update = ShadowViewMutation::UpdateMutation(
        mounted,
        recreated,
        node->placement() == CarrierPlacement::AT_ROOT ? carrierParentTag(node)
            : parent                                   ? parent->current.tag
                                                       : surfaceId_);
    if (node->state == LIVE) {
      mutation = std::move(update);
    } else {
      filteredMutations.push_back(std::move(update));
      withheldNodes.push_back(node);
    }
  }
  if (!withheldNodes.empty()) {
    activeBoundaryMayHaveChanged_ = true;
  }
  tearDown(collectRemovals(withheldNodes), filteredMutations);
  const auto deletesRecreatedTag = [&recreatedTags](const ShadowViewMutation &mutation) {
    return mutation.type == ShadowViewMutation::Delete && recreatedTags.contains(mutation.oldChildShadowView.tag);
  };
  std::erase_if(mutations, deletesRecreatedTag);
  std::erase_if(filteredMutations, deletesRecreatedTag);
}

#ifdef ANDROID
// Android applies the raw props of an Update as they are, so a prop that the mounted view has and the view leaves
// out is set to null, which resets it.
ShadowView LayoutAnimationsProxy::resetPropsMissingFrom(
    const ShadowView &view,
    const ShadowView &mounted,
    const PropsParserContext &propsParserContext) const {
  auto rawProps = view.props->rawProps;
  for (const auto &[name, _] : mounted.props->rawProps.items()) {
    if (rawProps.count(name) == 0) {
      rawProps[name] = nullptr;
    }
  }
  if (rawProps.size() == view.props->rawProps.size()) {
    return view;
  }
  auto newView = view;
  newView.props = componentDescriptorRegistry_->at(view.componentHandle)
                      .cloneProps(propsParserContext, view.props, RawProps(std::move(rawProps)));
  return newView;
}
#endif

// The differ sends a Create, Insert, Remove or Delete for each view of a subtree that it adds or deletes, but a Remove
// and an Insert only for the root of a subtree that it moves.
bool LayoutAnimationsProxy::mayChangeActiveBoundary(const ShadowViewMutation &mutation) const {
  switch (mutation.type) {
    case ShadowViewMutation::Create:
    case ShadowViewMutation::Insert:
      return isSETBoundary(mutation.newChildShadowView);
    case ShadowViewMutation::Delete:
      return isSETBoundary(mutation.oldChildShadowView);
    case ShadowViewMutation::Remove: {
      const auto nodeIt = lightNodes_.find(mutation.oldChildShadowView.tag);
      return nodeIt != lightNodes_.end() && holdsBoundary(nodeIt->second);
    }
    case ShadowViewMutation::Update: {
      const auto nodeIt = lightNodes_.find(mutation.newChildShadowView.tag);
      return nodeIt != lightNodes_.end() && isSETBoundary(nodeIt->second) &&
          isBoundaryActive(nodeIt->second) != isBoundaryActive(mutation.newChildShadowView);
    }
    default:
      return true;
  }
}

bool LayoutAnimationsProxy::holdsBoundary(const std::shared_ptr<LightNode> &node) const {
  return std::ranges::any_of(boundaries_, [&node](const auto &boundary) { return isInSubtree(boundary, node); });
}

// When the active boundary stays, a snapshot changes for its readers only in the views of a run, which follow their
// targets, and in the views that the commit adds or removes. A view that leaves a deleted parent and stays, as when
// React flattens the parent, keeps that parent among the ancestors that the iOS modal hold reads, so then all shared
// views are collected (nullopt).
std::optional<std::unordered_set<SharedTag>> LayoutAnimationsProxy::sharedTagsAffectedBy(
    const ShadowViewMutationList &mutations) const {
  std::unordered_set<Tag> deletedTags;
  for (const auto &mutation : mutations) {
    if (mutation.type == ShadowViewMutation::Delete) {
      deletedTags.insert(mutation.oldChildShadowView.tag);
    }
  }
  const bool leavesDeletedParent = std::ranges::any_of(mutations, [&deletedTags](const auto &mutation) {
    return mutation.type == ShadowViewMutation::Remove && deletedTags.contains(mutation.parentTag) &&
        !deletedTags.contains(mutation.oldChildShadowView.tag);
  });
  if (leavesDeletedParent) {
    return std::nullopt;
  }
  std::unordered_set<SharedTag> sharedTags;
  for (const auto &run : activeSharedTransitionRuns()) {
    sharedTags.insert(run.sharedTag);
  }
  auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  const auto &tagToName = sharedTransitionManager_->tagToName_;
  for (const auto &mutation : mutations) {
    if (mutation.type == ShadowViewMutation::Update) {
      continue;
    }
    const auto &view = mutation.type == ShadowViewMutation::Create || mutation.type == ShadowViewMutation::Insert
        ? mutation.newChildShadowView
        : mutation.oldChildShadowView;
    if (const auto nameIt = tagToName.find(view.tag); nameIt != tagToName.end()) {
      sharedTags.insert(nameIt->second);
    }
  }
  return sharedTags;
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  // we need to listen to every possible mutation to keep the light tree updated
  return true;
}

// MARK: Light Tree

// Moves Update and Create mutations into the filtered list: after this, the
// callers only check whether `mutations` is empty.
void LayoutAnimationsProxy::updateLightTree(
    const PropsParserContext &propsParserContext,
    ShadowViewMutationList &mutations,
    TransactionMeta &transaction) const {
  ReanimatedSystraceSection s("updateLightTree");
  auto &filteredMutations = transaction.filteredMutations;
  filteredMutations.reserve(filteredMutations.size() + mutations.size());
  auto &inserted = transaction.insertedTags;
  std::unordered_set<Tag> moved, deleted;
  std::unordered_map<Tag, ShadowView> updatedViews;
  std::unordered_map<Tag, std::vector<AncestorOrigin>> oldChains;
  std::unordered_set<Tag> removedSubtreeRoots;
  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    const auto &mutation = *it;
    switch (mutation.type) {
      case ShadowViewMutation::Delete: {
        deleted.insert(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Insert: {
        inserted.insert(mutation.newChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Remove: {
        const auto tag = mutation.oldChildShadowView.tag;
        if (inserted.contains(tag)) {
          moved.insert(tag);
        }
        break;
      }
      default: {
        // Skip other mutation types. We are only interested in moves and deletions here.
        break;
      }
    }
  }
  // The views before their updates are read only for moved views and their ancestors.
  if (!moved.empty()) {
    for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
      if (it->type == ShadowViewMutation::Update) {
        updatedViews.insert_or_assign(it->newChildShadowView.tag, it->oldChildShadowView);
      }
    }
  }

  for (auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation);
    switch (mutation.type) {
      case ShadowViewMutation::Update: {
        const auto nodeIt = lightNodes_.find(mutation.newChildShadowView.tag);
        if (nodeIt == lightNodes_.end()) {
          break;
        }
        const auto &node = nodeIt->second;
        const auto tag = mutation.newChildShadowView.tag;
        // Checked per mutation, as an Insert can transfer a config.
        const bool mayAnimate = !node->isCarrier() &&
            (hasLayoutAnimationRecords() || (nativeLayoutGroups_ && nativeLayoutGroups_->hasGroups()) ||
             layoutAnimationsManager_->hasLayoutAnimationConfigs(LAYOUT));
        const bool hasNewProps = mutation.oldChildShadowView.props != mutation.newChildShadowView.props;
        std::shared_ptr<Serializable> config;
        auto shouldAnimate = false;
        if (mayAnimate) {
          config = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LAYOUT);
          if (!config) {
            config = runningLayoutAnimationConfig(tag);
          }
          const bool leavesNativeRoute =
              hasNewProps && nativeLayoutGroups_ && !nativeLayoutGroups_->canContinueOn(mutation.newChildShadowView);
          shouldAnimate = hasLayoutChanged(mutation) || leavesNativeRoute;
        }
        Props::Shared previousProps;
        if ((config && shouldAnimate) || node->isCarrier()) {
          resolveLightNodeProps(node);
          previousProps = node->current.props;
        }
        updateLightNodeProps(node, mutation.oldChildShadowView, mutation.newChildShadowView);
        recordMountedOpacity(mutation);
        if (hasNewProps) {
          staleSynchronousProps_.forget(tag);
        }
        // The shared transition owns the mounted frame of its carrier.
        if (node->isCarrier()) {
          if (node->current.props != previousProps) {
            showCarrierReactProps(*runOfCarrier(node), previousProps, filteredMutations, propsParserContext);
          }
          break;
        }
        if (!mayAnimate) {
          filteredMutations.push_back(mutation);
          break;
        }
        if ((!config || !shouldAnimate) && updateEnteringAnimationTarget(tag, node->current)) {
          break;
        }
        if (config && shouldAnimate) {
          auto before = mutation.oldChildShadowView;
          if (previousProps) {
            before.props = previousProps;
          }
          transaction.layout.push_back({node, config, std::move(before)});
        } else if (config && (layoutAnimations_.contains(tag) || hasPendingLayoutAnimation(tag))) {
          updateLayoutAnimationTarget(tag, node->current, nullptr, config);
        } else {
          if (const auto currentView = takeCompletedLayoutAnimationView(tag)) {
            filteredMutations.push_back(
                ShadowViewMutation::UpdateMutation(*currentView, node->current, mutation.parentTag));
          } else {
            filteredMutations.push_back(std::move(mutation));
          }
        }
        break;
      }
      case ShadowViewMutation::Create: {
        const auto &node = std::make_shared<LightNode>();
        node->current = mutation.newChildShadowView;
        react_native_assert(!lightNodes_.contains(mutation.newChildShadowView.tag) && "LightNode already exists");

        if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
          forgetHiddenView(mutation.newChildShadowView.tag);
          if (isSETBoundary(node)) {
            boundaries_.insert(node);
          }
        }
        lightNodes_[mutation.newChildShadowView.tag] = node;
        staleSynchronousProps_.forget(mutation.newChildShadowView.tag);
        if (!transaction.recreatedTags.contains(mutation.newChildShadowView.tag)) {
          filteredMutations.push_back(std::move(mutation));
        }
        break;
      }
      case ShadowViewMutation::Delete: {
        const auto tag = mutation.oldChildShadowView.tag;
        const auto it = lightNodes_.find(tag);
        react_native_assert(
            (it == lightNodes_.end() || it->second->isExiting()) &&
            "Delete mutation for a view that React did not remove");
        // The differ removes everything that moves out of a view before its Delete, and inserts into the parent
        // of the view only after it.
        if (removedSubtreeRoots.erase(tag)) {
          react_native_assert(it != lightNodes_.end() && "Delete mutation for an unknown node");
          const auto node = it->second;
          if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
            if (!transaction.surfaceDropped && defersSubtreeRemoval(node)) {
              transaction.removedSubtrees.push_back(node);
            } else {
              handleSubtreeRemoval(node, transaction);
            }
          } else {
            handleSubtreeRemoval(node, transaction);
          }
        }
        staleSynchronousProps_.forget(tag);
        break;
      }
      case ShadowViewMutation::Insert: {
        transferConfigFromNativeID(mutation.newChildShadowView.props->nativeId, mutation.newChildShadowView.tag);
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        react_native_assert(node->state == LIVE && "React inserts a view whose removal is withheld");
        auto &parent = lightNodes_[mutation.parentTag];
        auto &cursors = transaction.indexCursors[mutation.parentTag];
        const auto position = parent->toPositionForInsert(mutation.index, cursors);
        const auto hostIndex = parent->hostIndex(position);
        LightNode::insertChild(parent, position, node);
        cursors.remove = {};
        if (node->placement() == CarrierPlacement::AT_ROOT) {
          break;
        }
        const auto tag = mutation.newChildShadowView.tag;
        std::optional<SharedTag> sharedTag;
        if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
          sharedTag = findSharedTag(mutation.newChildShadowView);
        }
        const auto layoutConfig = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LAYOUT);
        const auto enteringConfig = isViewKind(mutation.newChildShadowView)
            ? layoutAnimationsManager_->getLayoutAnimationConfig(tag, ENTERING)
            : nullptr;
        if (moved.contains(tag)) {
          const auto offset = reparentOffset(oldChains.at(tag), ancestorOrigins(parent, {}));
          for (auto &layout : transaction.layout) {
            if (layout.node == node) {
              layout.before.layoutMetrics.frame.origin += offset;
            }
          }
          const auto finalView =
              node->placement() == CarrierPlacement::NESTED ? movedCarrierTarget(tag, offset) : node->current;
          if (const auto currentView = reparentLayoutAnimation(tag, mutation.parentTag, finalView, offset)) {
            filteredMutations.push_back(
                ShadowViewMutation::InsertMutation(mutation.parentTag, *currentView, hostIndex));
          } else if (const auto updatedViewIt = updatedViews.find(tag); updatedViewIt != updatedViews.end() &&
                     layoutConfig && updatedViewIt->second.layoutMetrics.frame != node->current.layoutMetrics.frame) {
            auto updatedView = updatedViewIt->second;
            updatedView.layoutMetrics.frame.origin += offset;
            filteredMutations.push_back(ShadowViewMutation::InsertMutation(mutation.parentTag, updatedView, hostIndex));
          } else {
            react_native_assert(
                !hasPendingLayoutAnimation(tag) && "A moved view with a queued animation must mount its start view");
            auto view = mutation.newChildShadowView;
            const bool propsChanged = updatedViewIt != updatedViews.end() && updatedViewIt->second.props != view.props;
            if (!propsChanged) {
              view.props = propsOfMountedView(view);
            }
            filteredMutations.push_back(ShadowViewMutation::InsertMutation(mutation.parentTag, view, hostIndex));
          }
        } else if (enteringConfig) {
          transaction.entering.push_back({node, enteringConfig});
          filteredMutations.push_back(
              ShadowViewMutation::InsertMutation(mutation.parentTag, mutation.newChildShadowView, hostIndex));
        } else {
          filteredMutations.push_back(
              ShadowViewMutation::InsertMutation(mutation.parentTag, mutation.newChildShadowView, hostIndex));
          if (sharedTag) {
            transaction.insertedSharedViews.push_back({*sharedTag, node});
          }
        }
        break;
      }
      case ShadowViewMutation::Remove: {
        const auto nodeIt = lightNodes_.find(mutation.oldChildShadowView.tag);
        if (nodeIt == lightNodes_.end()) {
          break;
        }
        const auto &node = nodeIt->second;
        const auto tag = node->current.tag;
        const auto parentTag = mutation.parentTag;
        const auto &parent = lightNodes_[parentTag];
        react_native_assert(parent && "Remove mutation from an unknown parent");
        auto &cursors = transaction.indexCursors[parentTag];
        const auto position = parent->toPositionForRemove(mutation.index, cursors);
        const auto hostIndex = parent->hostIndex(position);
        cursors.insert = {};
        react_native_assert(
            position < static_cast<int>(parent->children.size()) &&
            parent->children[position]->current.tag == mutation.oldChildShadowView.tag &&
            "Indices are wrong in Remove mutation");

        if (!deleted.contains(tag)) {
          react_native_assert(!node->isExiting() && "Remove mutation for an exiting node");
          if (node->placement() == CarrierPlacement::AT_ROOT) {
            parent->extractChildAtRoot(node);
            break;
          }
          if (moved.contains(tag)) {
            oldChains[tag] = ancestorOrigins(parent, updatedViews);
          }
          filteredMutations.push_back(
              ShadowViewMutation::RemoveMutation(parentTag, mutation.oldChildShadowView, hostIndex));
          parent->children.erase(parent->children.begin() + position);
        } else {
          node->setExitingState(DECISION_PENDING);
          if (!deleted.contains(parentTag)) {
            removedSubtreeRoots.insert(tag);
          }
        }
        break;
      }
      default: {
        react_native_assert(false && "Unsupported mutation type");
        break;
      }
    }
  }
  react_native_assert(removedSubtreeRoots.empty() && "React removed a view without deleting it");
}

void LayoutAnimationsProxy::applyInitialMutationsToLightTree(const ShadowViewMutationList &mutations) const {
  for (const auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation);
    switch (mutation.type) {
      case ShadowViewMutation::Update: {
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        react_native_assert(node && "LightNode not found");
        updateLightNodeProps(node, mutation.oldChildShadowView, mutation.newChildShadowView);
        break;
      }
      case ShadowViewMutation::Create: {
        const auto &node = std::make_shared<LightNode>();
        node->current = mutation.newChildShadowView;
        react_native_assert(!lightNodes_.contains(mutation.newChildShadowView.tag) && "LightNode already exists");
        lightNodes_[mutation.newChildShadowView.tag] = node;
        if (isSETBoundary(node)) {
          boundaries_.insert(node);
        }
        break;
      }
      case ShadowViewMutation::Delete: {
        const auto tag = mutation.oldChildShadowView.tag;
        if (const auto it = lightNodes_.find(tag); it != lightNodes_.end()) {
          boundaries_.erase(it->second);
          lightNodes_.erase(it);
          if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
            if (sharedTransitionManager_->hasNames()) {
              unmappedContentFadeTags_.insert(tag);
            }
          }
        }
        break;
      }
      case ShadowViewMutation::Insert: {
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        auto &parent = lightNodes_[mutation.parentTag];
        react_native_assert(node && parent && "LightNode not found");
        LightNode::insertChild(parent, mutation.index, node);
        break;
      }
      case ShadowViewMutation::Remove: {
        const auto &parent = lightNodes_[mutation.parentTag];
        react_native_assert(
            parent->children[mutation.index]->current.tag == mutation.oldChildShadowView.tag &&
            "Indicies are wrong in Remove mutation");
        parent->children.erase(parent->children.begin() + mutation.index);
        break;
      }
      default: {
        react_native_assert(false && "Unsupported mutation type");
        break;
      }
    }
  }
}

// A commit that keeps the props object only moves the view, so the props the light
// tree already holds (merged or synchronous) stay valid.
void LayoutAnimationsProxy::updateLightNodeProps(
    const std::shared_ptr<LightNode> &node,
    const ShadowView &oldView,
    const ShadowView &newView) const {
  const auto currentProps = node->current.props;
  const auto propsChanged = newView.props != oldView.props;
  node->current = newView;
  if (!propsChanged) {
    node->current.props = currentProps;
    return;
  }
#ifdef ANDROID
  // On android rawProps hold only the props changed by the commit, so the full set is
  // accumulated here. This should be replaced in RN with Props 2.0 (the diffing will be
  // done at the end of the pipeline). The root view is never merged, as the stored
  // version might not be accurate because of the initialization order of proxy and surface.
  if (isRoot(node) || !currentProps || !newView.props) {
    return;
  }
  if (node->accumulatedRawProps.isNull()) {
    node->accumulatedRawProps = currentProps->rawProps;
  }
  for (const auto &[name, _] : newView.props->rawProps.items()) {
    node->pendingRawPropOwners[name.getString()] = newView.props;
  }
  node->propsNeedResolve = true;
#endif // ANDROID
}

void LayoutAnimationsProxy::resolveLightNodeProps(const std::shared_ptr<LightNode> &node) const {
#ifdef ANDROID
  if (!node->propsNeedResolve) {
    return;
  }
  node->foldPendingRawProps();
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  node->current.props = componentDescriptorRegistry_->at(node->current.componentHandle)
                            .cloneProps(propsParserContext, node->current.props, RawProps(node->accumulatedRawProps));
  node->propsNeedResolve = false;
#endif // ANDROID
}

// Synchronous prop updates skip pullTransaction. Animation records, detached carriers and the views that a shared
// transition follows take the values. The dynamic flag enables updates for other light nodes.
void LayoutAnimationsProxy::applySynchronousProps(const UpdatesBatch &updatesBatch, const bool trackInLightTree) const {
  ReanimatedSystraceSection s("applySynchronousProps");
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const bool hasRecords = hasLayoutAnimationRecords();
  if (!trackInLightTree) {
    markViewsFollowedBySharedTransitions();
  }
  bool updatesLightTree = false;

  for (const auto &[shadowNodeFamily, props] : updatesBatch) {
    if (shadowNodeFamily->getSurfaceId() != surfaceId_) {
      continue;
    }
    const auto tag = shadowNodeFamily->getTag();
    if (hasRecords) {
      applySynchronousPropsToLayoutAnimation(tag, props);
    }

    const auto nodeIt = lightNodes_.find(tag);
    if (nodeIt == lightNodes_.end()) {
      continue;
    }
    const auto &node = nodeIt->second;
    react_native_assert(node && "LightNode is nullptr");
    if (isRoot(node)) {
      continue;
    }
    if (!trackInLightTree && !node->isCarrier() && !isFollowedBySharedTransition(*node)) {
      staleSynchronousProps_.record(tag, props);
      continue;
    }
    if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
      if (isSETBoundary(node)) {
        activeBoundaryMayHaveChanged_ = true;
      }
    }

    react_native_assert(node->current.props && "LightNode has no props");
    staleSynchronousProps_.forget(tag, props);
#ifdef ANDROID
    if (node->accumulatedRawProps.isNull()) {
      node->accumulatedRawProps = node->current.props->rawProps;
    }
    // Synchronous props are newer than the props of earlier commits.
    node->foldPendingRawProps();
    node->accumulatedRawProps.update(props);
    node->propsNeedResolve = true;
    resolveLightNodeProps(node);
#else
    node->current.props = mergeSynchronousProps(node->current, props);
#endif
    updatesLightTree = true;
  }
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
    if (updatesLightTree && followSharedTransitionTargets(propsParserContext, false)) {
      schedulePullOnNextFrame();
    }
  }
}

void LayoutAnimationsProxy::startSurface(
    const ShadowTree &shadowTree,
    std::weak_ptr<const MountingOverrideDelegate> mountingOverrideDelegate) {
  react_native_assert(shadowTree.getSurfaceId() == surfaceId_ && "surface registered with the wrong proxy");
  if (nativeAnimationHost_) {
    nativeLayoutGroups_ = std::make_shared<NativeLayoutGroups>(
        nativeAnimationHost_, [weakThis = weak_from_this()](NativeLayoutBuildEnds buildEnds) {
          if (const auto strongThis = std::static_pointer_cast<LayoutAnimationsProxy>(weakThis.lock())) {
            strongThis->endNativeBuilds(std::move(buildEnds));
          }
        });
  }
  const auto mountingCoordinator = shadowTree.getMountingCoordinator();
  mountingCoordinator->setMountingOverrideDelegate(std::move(mountingOverrideDelegate));
  // The delegate must be set before the base revision is read, so that every
  // transaction is either contained in the revision or buffered by the proxy.
  initializeLightTree(mountingCoordinator->getBaseRevision());
}

void LayoutAnimationsProxy::initializeLightTree(const ShadowTreeRevision &baseRevision) {
  ShadowViewMutationList initialMutations;
  if (baseRevision.rootShadowNode) {
    const auto emptyRoot =
        baseRevision.rootShadowNode->ShadowNode::clone({.children = ShadowNode::emptySharedShadowNodeSharedList()});
    initialMutations = calculateShadowViewMutations(*emptyRoot, *baseRevision.rootShadowNode);
  }

  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  react_native_assert(!isLightTreeInitialized() && "Light tree is already initialized");
  const auto root = std::make_shared<LightNode>();
  if (baseRevision.rootShadowNode) {
    const auto &size = baseRevision.rootShadowNode->getLayoutMetrics().frame.size;
    window_ = {size.width, size.height};
    root->current = ShadowView(*baseRevision.rootShadowNode);
  } else {
    root->current.componentName = "RootView";
    root->current.tag = surfaceId_;
    root->current.props = std::make_shared<BaseViewProps>();
  }
  lightNodes_[surfaceId_] = root;
  applyInitialMutationsToLightTree(initialMutations);
  for (const auto &[revisionNumber, mutations] : pendingTransactions_) {
    if (revisionNumber > baseRevision.number) {
      applyInitialMutationsToLightTree(mutations);
    }
  }
  pendingTransactions_.clear();
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    topScreen_ = findActiveBoundary(lightNodes_.at(surfaceId_));
  }
  activeBoundaryMayHaveChanged_ = true;
}

// MARK: Layout Animation Updates

std::optional<SurfaceId> LayoutAnimationsProxy::endLayoutAnimation(int tag, bool shouldRemove) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  if (!shouldRemove) {
    completedAnimations_.insert_or_assign(tag, std::move(layoutAnimationIt->second));
    layoutAnimations_.erase(layoutAnimationIt);
    return surfaceId_;
  }
  auto exitedAnimation = std::make_shared<LayoutAnimation>(std::move(layoutAnimationIt->second));
  layoutAnimations_.erase(layoutAnimationIt);

  const auto nodeIt = lightNodes_.find(tag);
  // the withheld removal may have already been flushed (e.g. reconciled after
  // React re-created the tag) — the assert alone is compiled out in release
  // and operator[] would insert a null node here
  if (nodeIt == lightNodes_.end() || !nodeIt->second) {
    react_native_assert(false && "LightNode not found");
    return surfaceId_;
  }
  nodeIt->second->exitedAnimation = std::move(exitedAnimation);
  completeExit(nodeIt->second);

  return surfaceId_;
}

void LayoutAnimationsProxy::completeExit(const std::shared_ptr<LightNode> &node) const {
  node->setExitingState(COMPLETED);
  completedExits_.push_back(node);
}

// A subtree that animates keeps its place in the host tree, so nothing is emitted for its root.
// A subtree that does not animate is removed at its current host index after its descendants, like React
// removes it. On iOS a subtree that holds a screen React Native Screens snapshots is removed before its
// descendants instead, and their teardown mounts at the end of the transaction. On Android a stack screen is also
// removed first while animations run. A UI-thread pull can then mount its Remove before React Native Screens starts
// the exit transition. That transition keeps only the children that the screen still has.
void LayoutAnimationsProxy::handleSubtreeRemoval(const std::shared_ptr<LightNode> &node, TransactionMeta &transaction)
    const {
  ReanimatedSystraceSection s("handleSubtreeRemoval");
  const bool defersTeardown = holdsSnapshottedScreen(node);
  [[maybe_unused]] bool heldModal = false;
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (!transaction.surfaceDropped) {
      moveNestedCarriersOutOf(node, transaction);
    }
    removeCarriersHostedIn(node, transaction);
#ifdef __APPLE__
    if (!defersTeardown) {
      const auto endedRuns = runsEndedBy(node);
      heldModal = holdsModal(node, endedRuns, transaction);
      if (heldModal && !transaction.surfaceDropped) {
        stopSharedTransitions(endedRuns, node, transaction);
      }
    }
#endif
    retainRemovedCarriers(node, transaction);
    if (node->presence() == ReactPresence::REMOVED) {
      return;
    }
  }
  const bool removesRootFirst = defersTeardown || (startsExitTransitionOnRemove(node) && hasRunningAnimations());
#ifdef __APPLE__
  if (heldModal) {
    std::unordered_set<Tag> heldTags;
    collectSubtreeTags(node, heldTags);
    for (const auto tag : heldTags) {
      layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
    }
    node->setExitingState(COMPLETED);
    transaction.modalsToHold.push_back(node);
    return;
  }
#endif
  const SubtreeRemovalConfig config = {
      .shouldRemoveSubviewsWithoutAnimations = true,
      .shouldAnimate = !transaction.surfaceDropped,
      .isScreenPop = false,
  };
  std::vector<std::shared_ptr<LightNode>> removalRoots;
  if (!planSubtreeRemoval(node, transaction, config, removalRoots)) {
    removalRoots = {node};
  }
  std::unordered_set<Tag> removals;
  for (const auto &root : removalRoots) {
    collectSubtreeTags(root, removals);
  }
  for (const auto &root : removalRoots) {
    const auto parent = root->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");
    if (removals.contains(parent->current.tag)) {
      continue;
    }
    const bool removeBeforeChildren = removesRootFirst && root == node;
    if (defersTeardown && removeBeforeChildren && !transaction.screenSnapshotRemoval) {
      transaction.screenSnapshotRemoval = transaction.filteredMutations.size();
    }
    endAnimationsRecursively(
        root,
        defersTeardown ? transaction.teardownMutations : transaction.filteredMutations,
        transaction.filteredMutations,
        removeBeforeChildren);
    transaction.indexCursors.erase(parent->current.tag);
  }
}

// React Native Screens snapshots a screen in snapshottedScreens_ after pending updates when the screen is removed,
// so its content must still be mounted then.
bool LayoutAnimationsProxy::holdsSnapshottedScreen([[maybe_unused]] const std::shared_ptr<LightNode> &node) const {
#ifdef __APPLE__
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return std::ranges::any_of(snapshottedScreens_, [&](const Tag tag) {
      const auto it = lightNodes_.find(tag);
      return it != lightNodes_.end() && isInSubtree(it->second, node);
    });
  }
#endif
  return false;
}

bool LayoutAnimationsProxy::hasRunningAnimations() const {
  return hasLayoutAnimationRecords() || !completedExits_.empty() ||
      (nativeLayoutGroups_ && nativeLayoutGroups_->hasGroups()) || !std::ranges::empty(activeSharedTransitionRuns());
}

#ifdef __APPLE__
// React Native animates a modal that it removes while presented from a snapshot of what the screen shows, which lags a
// mount by up to two frames. A modal stays mounted until 34 ms, two frames of a 60 Hz display, after a source leaves it
// or a run in it stops.
bool LayoutAnimationsProxy::holdsModal(
    const std::shared_ptr<LightNode> &node,
    const std::vector<SharedTransitionRun *> &endedRuns,
    const TransactionMeta &transaction) const {
  const auto isInModal = [&](const std::shared_ptr<LightNode> &view) {
    return modalContentOf(view, node) != nullptr;
  };
  return std::ranges::any_of(transaction.startedSources, isInModal) ||
      std::ranges::any_of(
             endedRuns, [&](const SharedTransitionRun *run) { return modalContentOfRun(*run, node) != nullptr; });
}
#endif

// A removed carrier, and a carrier nested in it, have no path to the modal, so find the modal from the target.
std::shared_ptr<LightNode> LayoutAnimationsProxy::modalContentOfRun(
    const SharedTransitionRun &run,
    const std::shared_ptr<LightNode> &root) const {
  const auto detachedCarrier = detachedCarrierOf(run.carrier);
  const bool removed = detachedCarrier && detachedCarrier->presence() == ReactPresence::REMOVED;
  return modalContentOf(removed ? run.target : run.carrier, root);
}

std::shared_ptr<LightNode> LayoutAnimationsProxy::modalContentOf(
    const std::shared_ptr<LightNode> &view,
    const std::shared_ptr<LightNode> &root) const {
  std::shared_ptr<LightNode> content;
  for (auto child = view, ancestor = view->parent.lock(); ancestor;
       child = ancestor, ancestor = ancestor->parent.lock()) {
    if (!content && !strcmp(ancestor->current.componentName, "ModalHostView")) {
      content = child;
    }
    if (ancestor == root) {
      return content;
    }
  }
  return nullptr;
}

bool LayoutAnimationsProxy::isInHeldModal([[maybe_unused]] const std::shared_ptr<LightNode> &node) const {
#ifdef __APPLE__
  return std::ranges::any_of(heldModals_, [&node](const HeldModal &held) { return isInSubtree(node, held.node); });
#else
  return false;
#endif
}

// A UI-thread pull on Android must not update the views that the next flushing pull removes, because
// Android can mount that JS-thread pull first.
void LayoutAnimationsProxy::collectDueRemovals(TransactionMeta &transaction) const {
  // The teardown of another view can remove a node first.
  std::erase_if(completedExits_, [](const auto &node) { return node->state != COMPLETED; });
  std::vector<std::shared_ptr<LightNode>> finishedExits;
#ifdef __APPLE__
  const auto now = std::chrono::steady_clock::now();
  for (auto &node : transaction.modalsToHold) {
    heldModals_.push_back({std::move(node), now + std::chrono::milliseconds(34)});
  }
  std::erase_if(heldModals_, [&](const HeldModal &held) {
    if (!isLightNodeMapped(held.node)) {
      return true;
    }
    if (transaction.surfaceDropped || now >= held.removableAt) {
      removeCarriersHostedIn(held.node, transaction);
      finishedExits.push_back(held.node);
      return true;
    }
    schedulePullOnNextFrame();
    return false;
  });
#endif
  for (const auto &node : completedExits_) {
    if (!hasPendingLayoutAnimation(node->current.tag) && isLightNodeMapped(node) && !isRetainedContent(node)) {
      finishedExits.push_back(node);
    }
  }
  transaction.dueRemovals = collectRemovals(finishedExits);
}

void LayoutAnimationsProxy::tearDown(const std::unordered_set<Tag> &removals, ShadowViewMutationList &mutations) const {
  ReanimatedSystraceSection s("tearDown");
  std::vector<std::shared_ptr<LightNode>> roots;
  for (const auto tag : removals) {
    const auto &node = lightNodes_.at(tag);
    const auto parent = node->parent.lock();
    react_native_assert((parent || node->presence() == ReactPresence::REMOVED) && "Parent node is nullptr");
    if (!parent || !removals.contains(parent->current.tag)) {
      roots.push_back(node);
    }
  }
  [[maybe_unused]] const auto lightNodeCount = lightNodes_.size();
  for (const auto &root : roots) {
    endAnimationsRecursively(root, mutations, mutations);
  }
  react_native_assert(
      lightNodeCount - lightNodes_.size() == removals.size() &&
      std::ranges::none_of(removals, [this](const Tag tag) { return lightNodes_.contains(tag); }) &&
      "The teardown must remove exactly the removals");
}

void LayoutAnimationsProxy::addOngoingAnimations(TransactionMeta &transaction) const {
  ReanimatedSystraceSection s1("addOngoingAnimations");
  auto &mutations = transaction.filteredMutations;
#ifdef ANDROID
  std::optional<std::unique_ptr<int[]>> maybeCorrectedTags;

  if (!pullsOnMountThread()) {
    std::vector<int> tagsToUpdate;
    tagsToUpdate.reserve(updateMap_.size());
    for (const auto &[tag, _] : updateMap_) {
      tagsToUpdate.push_back(tag);
    }

    maybeCorrectedTags = preserveMountedTags_(tagsToUpdate);
    if (!maybeCorrectedTags.has_value()) {
      return;
    }
  }

  const auto correctedTags = maybeCorrectedTags.has_value() ? maybeCorrectedTags->get() : nullptr;

  // since the map is not updated, we can assume that the ordering of tags in
  // correctedTags matches the iterator
  int i = -1;
#endif
  for (auto &[tag, updateValues] : updateMap_) {
#ifdef ANDROID
    i++;
    if (correctedTags != nullptr && correctedTags[i] == -1) {
      // skip views that have not been mounted yet
      // on Android we start entering animations from the JS thread
      // so it might happen, that the first frame of the animation goes through
      // before the view is first mounted
      // https://github.com/software-mansion/react-native-reanimated/issues/7493
      continue;
    }
    if (transaction.dueRemovals.contains(tag) || unqueuedBatchTags_.contains(tag)) {
      continue;
    }
#endif

    if (isRetiringContent(tag)) {
      continue;
    }
    auto layoutAnimationIt = layoutAnimations_.find(tag);
    auto completedAnimationIt = completedAnimations_.find(tag);
    LayoutAnimation *animation = nullptr;
    if (layoutAnimationIt != layoutAnimations_.end()) {
      animation = &layoutAnimationIt->second;
    } else if (completedAnimationIt != completedAnimations_.end()) {
      animation = &completedAnimationIt->second;
    } else if (const auto node = lightNodes_.find(tag);
               node != lightNodes_.end() && node->second->exitedAnimation && isRetainedContent(node->second)) {
      animation = node->second->exitedAnimation.get();
    } else {
      continue;
    }
    auto &layoutAnimation = *animation;
    mutations.push_back(frameUpdate(
        layoutAnimation,
        updateValues,
        layoutAnimation.frameProps || layoutAnimation.type == LayoutAnimationType::EXITING));
    recordMountedOpacity(mutations.back());
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
    traceFirstFrameUpdates(mutations.back().oldChildShadowView, mutations.back().newChildShadowView);
#endif
    if (isSharedTransition(layoutAnimation.type)) {
      updateCarrierClip(tag, layoutAnimation, mutations, {surfaceId_, *contextContainer_});
    }
    if (layoutAnimation.opacity &&
        (updateValues.animatesOpacity ||
         getViewProps(layoutAnimation.currentView).opacity == *layoutAnimation.opacity)) {
      layoutAnimation.opacity.reset();
    }
  }
#ifdef ANDROID
  // The next JS-thread pull can retain a due removal instead of removing it. That pull then sends the last frame.
  std::erase_if(updateMap_, [this, &transaction](const auto &update) {
    const auto tag = update.first;
    const bool waitsForRemoval = transaction.dueRemovals.contains(tag) && lightNodes_.contains(tag);
    return !unqueuedBatchTags_.contains(tag) && !waitsForRemoval;
  });
#else
  updateMap_.clear();
#endif
}

void LayoutAnimationsProxy::endAnimationsRecursively(
    const std::shared_ptr<LightNode> &node,
    ShadowViewMutationList &mutations,
    ShadowViewMutationList &rootMutations,
    const bool removeBeforeChildren) const {
  node->setExitingState(TORN_DOWN);
  if (removeBeforeChildren) {
    removeFromParent(node, rootMutations, rootMutations);
  }
  while (!node->children.empty()) {
    const auto child = node->children.back();
    endAnimationsRecursively(child, mutations, rootMutations);
  }
  if (!removeBeforeChildren) {
    removeFromParent(node, mutations, rootMutations);
  }
  unmapLightNode(node);
  mutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
}

bool LayoutAnimationsProxy::planSubtreeRemoval(
    const std::shared_ptr<LightNode> &node,
    TransactionMeta &transaction,
    SubtreeRemovalConfig config,
    std::vector<std::shared_ptr<LightNode>> &removals) const {
  react_native_assert(node->state == DECISION_PENDING && "Subtree removal of a view that React does not delete");
  transaction.indexCursors.erase(node->current.tag);
  auto &[shouldRemoveSubviewsWithoutAnimations, shouldAnimate, isScreenPop] = config;
  if (isRNSScreenOrStack(node)) {
    isScreenPop = true;
  }

  shouldAnimate = !isScreenPop && layoutAnimationsManager_->shouldAnimateExiting(node->current.tag, shouldAnimate);

  const auto exitConfig =
      shouldAnimate ? layoutAnimationsManager_->takeExitingAnimationConfigAndClearTag(node->current.tag) : nullptr;
  const bool hasExitAnimation = exitConfig != nullptr;
  bool hasAnimatedChildren = false;

  shouldRemoveSubviewsWithoutAnimations = shouldRemoveSubviewsWithoutAnimations && !hasExitAnimation;
  for (const auto &subNode : std::views::reverse(node->children)) {
    if (!subNode->isExiting()) {
      subNode->setExitingState(DECISION_PENDING);
    }
    if (subNode->state != DECISION_PENDING) {
      if (shouldAnimate && subNode->state != COMPLETED) {
        hasAnimatedChildren = true;
      } else {
        removals.push_back(subNode);
      }
    } else if (planSubtreeRemoval(subNode, transaction, config, removals)) {
      hasAnimatedChildren = true;
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      removals.push_back(subNode);
    } else {
      subNode->setExitingState(WAITING);
    }
  }

  const bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->setExitingState(ANIMATING);
    transaction.exiting.push_back({node, exitConfig});
  } else {
    if (!shouldAnimate) {
      layoutAnimationsManager_->clearLayoutAnimationConfig(node->current.tag);
    }
    if (hasAnimatedChildren) {
      node->setExitingState(WAITING);
    }
  }

  return wantAnimateExit;
}

std::shared_ptr<Serializable> LayoutAnimationsProxy::runningLayoutAnimationConfig(const Tag tag) const {
  if (auto config = getRetargetLayoutAnimationConfig(tag)) {
    return config;
  }
  return nativeLayoutGroups_ ? nativeLayoutGroups_->retargetConfig(tag) : nullptr;
}

ShadowViewMutation LayoutAnimationsProxy::updateToMount(
    const ShadowViewMutation &mutation,
    const std::shared_ptr<LightNode> &node) const {
  if (const auto currentView = takeCompletedLayoutAnimationView(node->current.tag)) {
    return ShadowViewMutation::UpdateMutation(*currentView, node->current, mutation.parentTag);
  }
  return mutation;
}

bool LayoutAnimationsProxy::admitsNativeStart(const std::shared_ptr<LightNode> &node, const LayoutAnimationType type)
    const {
  const auto tag = node->current.tag;
  const bool isExit = type == LayoutAnimationType::EXITING;
  // The frame driver mounts the last update of an animation that it completed, so it takes the exit then.
  const bool hasFrameDrivenState = layoutAnimations_.contains(tag) || hasPendingLayoutAnimation(tag) ||
      (isExit && completedAnimations_.contains(tag));
  const bool admitsOnView = nativeLayoutGroups_ && isLightNodeMapped(node) && node->isExiting() == isExit &&
      !hasFrameDrivenState && !viewTagsKeptHidden().contains(tag) && !fadesWithCarrierContent(node);
  if (!admitsOnView) {
    return false;
  }
  if (currentPull_.mountReport) {
    return true;
  }
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  if (worklets::isOnUIThread(uiScheduler_)) {
    traceStartRefused(tag, type);
  }
#endif
  return false;
}

bool LayoutAnimationsProxy::admitsNativeEnteringStart(
    const std::shared_ptr<LightNode> &node,
    const TransactionMeta &transaction) const {
  if (!admitsNativeStart(node, ENTERING)) {
    return false;
  }
  if (mountsInWindow(node, transaction)) {
    return true;
  }
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  traceStartRefused(node->current.tag, ENTERING);
#endif
  return false;
}

bool LayoutAnimationsProxy::mountsInWindow(const std::shared_ptr<LightNode> &node, const TransactionMeta &transaction)
    const {
  auto ancestor = node->parent.lock();
  while (ancestor && transaction.insertedTags.contains(ancestor->current.tag)) {
    if (std::strcmp(ancestor->current.componentName, ViewComponentName) != 0 ||
        removesClippedSubviews(ancestor->current)) {
      return false;
    }
    ancestor = ancestor->parent.lock();
  }
  return ancestor && !removesClippedSubviews(ancestor->current) &&
      nativeAnimationHost_->isMountedInWindow(surfaceId_, ancestor->current.tag);
}

bool LayoutAnimationsProxy::startNativePlayback(ManagedLayoutAnimationStart &start) const {
  const auto tag = start.tag;
  if (const auto completedView = takeCompletedLayoutAnimationView(tag)) {
    start.before = *completedView;
  }
  const auto buildSummary = buildLayoutAnimation(start);
  if (!buildSummary.isObject()) {
    return false;
  }
  const auto buildId = *start.buildId;
  const native_animation::AnimationHandle handle{surfaceId_, tag, native_animation::AnimationOwner::Layout, buildId};
  // An exiting animation ends at values that the view never gets.
  const auto endpointPolicy = start.type == LayoutAnimationType::EXITING
      ? native_animation::EndpointPolicy::HoldWithoutCommit
      : native_animation::EndpointPolicy::MountedModelMustMatchEndpoint;
  const auto summary = buildSummary.asObject(uiRuntime_);
  // The frame driver starts an exit from the live values of the native group that the exit interrupts.
  auto build =
      start.type == LayoutAnimationType::EXITING && summary.getProperty(uiRuntime_, "replacesLiveLeaf").asBool()
      ? std::variant<NativeLayoutTracks, native_animation::TrackBuildFailure>(
            native_animation::TrackBuildFailure::UnsupportedContinuation)
      : makeNativeLayoutTracks(uiRuntime_, summary, start.after, *nativeAnimationHost_, endpointPolicy);
  if ([[maybe_unused]] const auto *failure = std::get_if<native_animation::TrackBuildFailure>(&build)) {
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
    nativeAnimationHost_->trace().record(
        {.event = native_animation::TraceEventType::LayoutBuildFailed,
         .handle = handle,
         .objective = traceObjectiveOf(start.type),
         .buildFailure = *failure,
         .transactionNumber = currentPull_.transactionNumber,
         .layoutAnimationType = toString(start.type)});
#endif
    return false;
  }
  auto &[originTimestampMs, tracks] = std::get<NativeLayoutTracks>(build);
  native_animation::AnimationRequest request{handle, originTimestampMs, std::move(tracks)};

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  auto &tracksWithoutFrameUpdate = nativeTracksWithoutFrameUpdate_[tag];
  for (const auto &track : request.tracks) {
    std::erase_if(tracksWithoutFrameUpdate, [&track](const native_animation::TrackKey &key) {
      return native_animation::targetsOverlap(key.target, track.target);
    });
    tracksWithoutFrameUpdate.push_back({handle, track.target});
  }
  nativeAnimationHost_->trace().record(
      {.event = native_animation::TraceEventType::LayoutStartPending,
       .handle = handle,
       .objective = traceObjectiveOf(start.type),
       .transactionNumber = currentPull_.transactionNumber,
       .layoutAnimationType = toString(start.type)});
#endif
  if (const auto oldGroupEnd = nativeLayoutGroups_->start(request, start.type, start.config)) {
    pendingNativeBuildEnds_.push_back(*oldGroupEnd);
  }
  currentPull_.operations.emplace_back(native_animation::MountedStart{std::move(request), nativeLayoutGroups_});
  return true;
}

jsi::Value LayoutAnimationsProxy::buildLayoutAnimation(ManagedLayoutAnimationStart &start) const {
  react_native_assert(worklets::isOnUIThread(uiScheduler_) && "a layout animation build needs the UI runtime");
  start.buildId = makeBuildId();
  const auto liveTracks = nativeLayoutGroups_->members(start.tag);
  start.liveLeaves = liveLayoutLeaves(liveTracks);
  const auto capturedView = viewWithLiveLeafValues(start.before, start.liveLeaves);
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  for (const auto &track : liveTracks) {
    const auto capturedValue = leafValue(track.target, capturedView);
    const auto *scalar = std::get_if<double>(&capturedValue);
    nativeAnimationHost_->trace().record(
        {.event = native_animation::TraceEventType::LayoutLeafCaptured,
         .handle = track.handle,
         .target = track.target,
         .objective = 9,
         .transactionNumber = currentPull_.transactionNumber,
         .leafValue = scalar == nullptr ? std::nullopt : std::optional(*scalar)});
  }
#endif
  return layoutAnimationsManager_->buildLayoutAnimation(
      uiRuntime_,
      *start.buildId,
      layoutAnimationValues(start, capturedView, window_),
      start.config,
      NativeLayoutLimits{},
      start.liveLeaves);
}

ShadowView LayoutAnimationsProxy::viewWithLiveLeafValues(const ShadowView &mounted, const LiveLayoutLeaves &liveLeaves)
    const {
  if (liveLeaves.empty()) {
    return mounted;
  }
  const auto values =
      liveLeafValues(uiRuntime_, layoutAnimationsManager_->captureLiveLayoutLeaves(uiRuntime_, liveLeaves));
  folly::dynamic liveProps = folly::dynamic::object;
  if (values.opacity) {
    liveProps["opacity"] = *values.opacity;
  }
  if (values.transform) {
    liveProps["transform"] = *values.transform;
  }
  auto shown = liveProps.empty()
      ? mounted
      : cloneViewWithProps(mounted, std::move(liveProps), PropsParserContext{surfaceId_, *contextContainer_});
  auto &frame = shown.layoutMetrics.frame;
  frame.origin.x = static_cast<react::Float>(values.originX.value_or(frame.origin.x));
  frame.origin.y = static_cast<react::Float>(values.originY.value_or(frame.origin.y));
  frame.size.width = static_cast<react::Float>(values.width.value_or(frame.size.width));
  frame.size.height = static_cast<react::Float>(values.height.value_or(frame.size.height));
  return shown;
}

void LayoutAnimationsProxy::continueOnFrameDriver(ManagedLayoutAnimationStart &start) const {
  if (!nativeLayoutGroups_) {
    return;
  }
  if (!start.buildId && !nativeLayoutGroups_->members(start.tag).empty()) {
    buildLayoutAnimation(start);
  }
  cancelNativeLayoutAnimation(start.tag);
}

void LayoutAnimationsProxy::cancelNativeLayoutAnimation(const Tag tag) const {
  if (!nativeLayoutGroups_) {
    return;
  }
  if (const auto cancelled = nativeLayoutGroups_->cancel(tag)) {
    stopAfterMount(cancelled->commandsToStop);
    pendingNativeBuildEnds_.push_back(cancelled->end);
  }
}

void LayoutAnimationsProxy::hideNativeOpacityAnimation(const Tag tag) const {
  if (!nativeLayoutGroups_) {
    return;
  }
  const auto isOpacityTrack = [](const native_animation::TrackKey &track) {
    return track.target == native_animation::AnimationTarget::Opacity;
  };
  if (!std::ranges::any_of(nativeLayoutGroups_->members(tag), isOpacityTrack)) {
    return;
  }
  const auto cancelled = nativeLayoutGroups_->cancelForFrameDriver(tag);
  if (!cancelled) {
    return;
  }
  stopAfterMount(cancelled->commandsToStop);
  if (!transferToFrameDriver(cancelled->end)) {
    pendingNativeBuildEnds_.push_back(cancelled->end);
  }
}

void LayoutAnimationsProxy::stopAfterMount(const std::vector<native_animation::AnimationHandle> &commands) const {
  react_native_assert(LayoutAnimationsPull::isRunningOnThisThread() && "only a pull has a mount report");
  for (const auto &command : commands) {
    currentPull_.operations.emplace_back(native_animation::MountedStop{command});
  }
}

void LayoutAnimationsProxy::recordMountedOpacity(const ShadowViewMutation &mutation) const {
  const auto &view = mutation.newChildShadowView;
  if (!nativeLayoutGroups_ || !currentPull_.mountReport || !isViewKind(view)) {
    return;
  }
  const auto opacity = getViewProps(view).opacity;
  if (opacity == getViewProps(mutation.oldChildShadowView).opacity) {
    return;
  }
  currentPull_.operations.emplace_back(
      native_animation::MountedModel{surfaceId_, view.tag, native_animation::AnimationTarget::Opacity, opacity});
}

void LayoutAnimationsProxy::flushNativeBuildEnds() const {
  if (pendingNativeBuildEnds_.empty()) {
    return;
  }
  endNativeBuilds(std::exchange(pendingNativeBuildEnds_, {}));
}

void LayoutAnimationsProxy::endNativeBuilds(NativeLayoutBuildEnds buildEnds) const {
  react_native_assert(worklets::isOnUIThread(uiScheduler_) && "a native build end needs the UI runtime");
  const auto transferredCount = std::erase_if(
      buildEnds, [this](const NativeLayoutBuildEnd &buildEnd) { return transferToFrameDriver(buildEnd); });
  // The frame-driven start reads the builds of the joined tracks, so it runs before their release.
  if (transferredCount > 0) {
    flushLayoutAnimationOperations();
  }
  completeNativeExits(buildEnds);
  deliverNativeBuildEnds(*layoutAnimationsManager_, uiRuntime_, buildEnds);
}

bool LayoutAnimationsProxy::transferToFrameDriver(const NativeLayoutBuildEnd &buildEnd) const {
  if (!buildEnd.frameDriverHandover) {
    return false;
  }
  const auto &handover = *buildEnd.frameDriverHandover;
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto nodeIt = lightNodes_.find(handover.tag);
  if (nodeIt == lightNodes_.end()) {
    return false;
  }
  const auto &node = nodeIt->second;
  if (handover.type == LayoutAnimationType::EXITING && node->state != ANIMATING) {
    return false;
  }
  const auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = handover.tag,
      .type = handover.type,
      .before = node->current,
      .after = node->current,
      .parentTag = parent->current.tag,
      .config = handover.config,
      .buildId = buildEnd.buildId,
      .liveLeaves = liveLayoutLeaves(handover.joinedTracks),
  });
  return true;
}

void LayoutAnimationsProxy::completeNativeExits(const NativeLayoutBuildEnds &buildEnds) const {
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  bool hasCompletedExit = false;
  for (const auto &buildEnd : buildEnds) {
    if (!buildEnd.exitedTag) {
      continue;
    }
    const auto nodeIt = lightNodes_.find(*buildEnd.exitedTag);
    // A removal that stops the exiting animation takes the node away itself.
    if (nodeIt == lightNodes_.end() || nodeIt->second->state != ANIMATING) {
      continue;
    }
    completeExit(nodeIt->second);
    hasCompletedExit = true;
  }
  if (hasCompletedExit) {
    schedulePullOnNextFrame();
  }
}

void LayoutAnimationsProxy::surfaceDidMount(const std::optional<std::uint64_t> reportedMount) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto pulls = std::exchange(pendingPulls_, {});
  react_native_assert(
      (!reportedMount ||
       std::ranges::all_of(
           pulls, [reportedMount](const PullRecord &pull) { return pull.mountReport == reportedMount; })) &&
      "a mount report took the record of a pull of another mount report");
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  const MountReportTrace reportTrace(nativeAnimationHost_->trace(), surfaceId_, pulls);
#endif
  lock.unlock();

  std::vector<native_animation::MountedOperation> mountOperations;
  for (auto &pull : pulls) {
    std::ranges::move(pull.operations, std::back_inserter(mountOperations));
  }
  if (!mountOperations.empty()) {
    nativeAnimationHost_->runAfterMount(mountOperations);
  }
}

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
void LayoutAnimationsProxy::traceFirstFrameUpdates(const ShadowView &currentView, const ShadowView &newView) const {
  const auto tracksIt = nativeTracksWithoutFrameUpdate_.find(newView.tag);
  if (tracksIt == nativeTracksWithoutFrameUpdate_.end()) {
    return;
  }
  std::erase_if(tracksIt->second, [&](const native_animation::TrackKey &track) {
    if (leafValue(track.target, currentView) == leafValue(track.target, newView)) {
      return false;
    }
    currentPull_.firstFrameUpdates.push_back(track);
    return true;
  });
}

void LayoutAnimationsProxy::traceStartRefused(const Tag tag, const LayoutAnimationType type) const {
  nativeAnimationHost_->trace().record(
      {.event = native_animation::TraceEventType::LayoutStartRefused,
       .handle = {surfaceId_, tag, native_animation::AnimationOwner::Layout, 0},
       .objective = traceObjectiveOf(type),
       .result =
           native_animation::AnimationResult{
               native_animation::AnimationOutcome::Rejected,
               native_animation::AnimationResultReason::TargetUnavailable},
       .transactionNumber = currentPull_.transactionNumber,
       .layoutAnimationType = toString(type)});
}
#endif

void LayoutAnimationsProxy::shadowTreeWillCommit(const bool isSurfaceRemoval) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  surfaceToRemove_ = isSurfaceRemoval;
}

void LayoutAnimationsProxy::clearSurfaceState() const {
  LayoutAnimationsProxyCommon::clearSurfaceState();
  completedExits_.clear();
  currentPull_ = {};
  pendingPulls_.clear();
  if (nativeLayoutGroups_) {
    scheduleOnUI(
        uiScheduler_,
        [layoutAnimationsManager = layoutAnimationsManager_,
         &uiRuntime = uiRuntime_,
         buildEnds = nativeLayoutGroups_->clear()]() {
          deliverNativeBuildEnds(*layoutAnimationsManager, uiRuntime, buildEnds);
        });
  }
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  nativeTracksWithoutFrameUpdate_.clear();
#endif
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    for (const auto &[tag, _] : lightNodes_) {
      layoutAnimationsManager_->clearSharedTransitionContentFade(tag);
    }
    releaseUnmappedContentFadeConfigs();
    if (uncommittedScreenPop_) {
      for (auto &config : uncommittedScreenPop_->progressCallbacks) {
        scheduleSharedTransitionCallback(std::move(config), false);
      }
    }
    carrierPlacements_.clear();
    for (auto &[_, run] : sharedTransitionRuns_) {
      finishCallback(run, false);
      carrierPlacements_.tearDown(run.carrier);
    }
    layoutAnimationsManager_->clearSharedTransitionConfigs(std::vector<Tag>(
        deferredSharedTransitionConfigReleases_.begin(), deferredSharedTransitionConfigReleases_.end()));
    deferredSharedTransitionConfigReleases_.clear();
    sharedElements_.clear();
    sharedTransitionRuns_.clear();
    react_native_assert(carrierLayers_.empty() && "The last pull of a surface removes its carrier layers");
    heldEnterings_.clear();
    snapshottedScreens_.clear();
    transition_.reset();
    uncommittedScreenPop_.reset();
    visibleScreens_.clear();
  }
#ifdef __APPLE__
  heldModals_.clear();
#endif
#ifdef ANDROID
  cleanupPullScheduled_ = false;
  unqueuedBatchTags_.clear();
  unqueuedCarrierFrames_.clear();
  carrierFramesWithoutRelease_.clear();
  pullWaitsForCarrierRelease_ = false;
  carrierDeletesAfterQueuedFrames_.clear();
#endif
}

ShadowView LayoutAnimationsProxy::cloneViewWithoutOpacity(
    const ShadowView &shadowView,
    const PropsParserContext &propsParserContext) const {
  react_native_assert(isViewKind(shadowView) && "Only ViewKind views have ViewProps");
  auto newView = shadowView;
  folly::dynamic rawProps = folly::dynamic::object("opacity", 0);
#ifdef ANDROID
  rawProps = folly::dynamic::merge(shadowView.props->rawProps, rawProps);
#endif
  auto newProps = componentDescriptorRegistry_->at(newView.componentHandle)
                      .cloneProps(propsParserContext, newView.props, RawProps(rawProps));
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
  viewProps->opacity = 0;
  newView.props = newProps;
  return newView;
}

// Android's push model applies JS-thread transactions asynchronously on the UI
// thread. A UI-thread pull can overtake them, so completed animations must not
// add structural cleanup mutations there.
//
// Under the pull model there is nothing left to overtake, because every
// transaction is pulled from the UI thread's frame callback. Keeping the thread
// check on its own there would mean this never returns true, so no exiting view
// would ever have its removal flushed, and every one of them would stay mounted
// for the lifetime of the surface.
bool LayoutAnimationsProxy::shouldFlushStructuralMutations() const {
#ifdef ANDROID
  return pullsOnMountThread() || !worklets::isOnUIThread(uiScheduler_);
#else
  return true;
#endif
}

void LayoutAnimationsProxy::cleanupAnimations(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations) const {
  ReanimatedSystraceSection s("cleanupAnimations");
  std::unordered_set<Tag> preservedTags;
#ifdef ANDROID
  if (!flushStructuralMutations) {
    preservedTags = transaction.dueRemovals;
  }
  for (const auto &[tag, _] : unqueuedBatchTags_) {
    preservedTags.insert(tag);
  }
#endif
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    finishRetiringSharedTransitions(transaction, propsParserContext, flushStructuralMutations);
    if (!carrierPlacements_.atRoot().empty()) {
      for (const auto &[tag, _] : completedAnimations_) {
        const auto node = lightNodes_.find(tag);
        if (node == lightNodes_.end()) {
          continue;
        }
        const auto carrier = detachedCarrierOf(node->second);
        if (carrier &&
            (sharedTransitionRun(carrier->current.tag, SharedTransitionLifecycle::RETIRING) ||
             hasUnqueuedCarrierFrame(carrier->current.tag))) {
          preservedTags.insert(tag);
        }
      }
    }
    finishEndedSharedTransitions(transaction, propsParserContext, flushStructuralMutations, preservedTags);
    queuePendingRestores(transaction);
    cleanupSharedTransitions(transaction, propsParserContext);
  }
  cleanupCompletedAnimations(transaction.filteredMutations, propsParserContext, preservedTags);
#ifdef ANDROID
  if (flushStructuralMutations) {
    flushCarrierDeletesAfterQueuedFrames(transaction.filteredMutations);
  }
#endif
}

bool LayoutAnimationsProxy::hasUnqueuedCarrierFrame([[maybe_unused]] const Tag tag) const {
#ifdef ANDROID
  if (!unqueuedCarrierFrames_.contains(tag)) {
    return false;
  }
  pullWaitsForCarrierRelease_ = true;
  return true;
#else
  return false;
#endif
}

#ifdef ANDROID
bool LayoutAnimationsProxy::hasPendingStructuralCleanup() const {
  if (std::ranges::any_of(sharedTransitionRuns_, [this](const auto &entry) {
        const auto &[carrierTag, run] = entry;
        return run.lifecycle == SharedTransitionLifecycle::RETIRING && !hasUnqueuedCarrierFrame(carrierTag);
      })) {
    return true;
  }
  if (!carrierDeletesAfterQueuedFrames_.empty() &&
      !hasUnqueuedCarrierFrame(carrierDeletesAfterQueuedFrames_.front().first)) {
    return true;
  }
  const auto coveringViews = viewsHiddenByContinuingRuns();
  const bool hasCompletedExit = std::ranges::any_of(completedExits_, [this](const auto &node) {
    return node->state == COMPLETED && !hasPendingLayoutAnimation(node->current.tag) && !isRetainedContent(node);
  });
  return hasCompletedExit || std::ranges::any_of(completedAnimations_, [&](const auto &entry) {
           return !hasPendingLayoutAnimation(entry.first) && isCarrierOfUncoveredRun(entry.first, coveringViews);
         });
}

bool LayoutAnimationsProxy::isCarrierOfUncoveredRun(
    const Tag tag,
    const std::vector<std::shared_ptr<LightNode>> &coveringViews) const {
  const auto *run = sharedTransitionRun(tag, SharedTransitionLifecycle::ACTIVE);
  return run && !isDescendantOfAny(run->target, coveringViews) && !landsWithOtherRuns(*run);
}

void LayoutAnimationsProxy::maybeScheduleCleanupPull(const bool flushedStructuralMutations) const {
  if (flushedStructuralMutations) {
    cleanupPullScheduled_ = false;
  } else if (hasPendingStructuralCleanup() && !cleanupPullScheduled_) {
    cleanupPullScheduled_ = true;
    scheduleCleanupPull();
  }
}

// The Remove of a held view keeps its parent, so the Insert into the root would fail. A hold can appear until the
// batch mounts, so the release repeats before every mount until the batch is in the queue.
void LayoutAnimationsProxy::releaseViewTransitionsOfMovedCarriers(const ShadowViewMutationList &mutations) const {
  if (carrierPlacements_.atRoot().empty()) {
    return;
  }
  std::unordered_set<Tag> removedFromParents;
  std::vector<Tag> movedToRoot;
  for (const auto &mutation : mutations) {
    if (mutation.type == ShadowViewMutation::Remove) {
      const auto tag = mutation.oldChildShadowView.tag;
      if (std::erase(movedToRoot, tag) == 0) {
        removedFromParents.insert(tag);
      }
    } else if (mutation.type == ShadowViewMutation::Insert) {
      const auto tag = mutation.newChildShadowView.tag;
      const auto nodeIt = lightNodes_.find(tag);
      if (removedFromParents.contains(tag) && nodeIt != lightNodes_.end() &&
          nodeIt->second->placement() == CarrierPlacement::AT_ROOT &&
          mutation.parentTag == carrierParentTag(nodeIt->second)) {
        movedToRoot.push_back(tag);
      }
    }
  }
  if (movedToRoot.empty()) {
    return;
  }
  releaseViewTransitions_(movedToRoot, false);
  if (pullsOnMountThread() || worklets::isOnUIThread(uiScheduler_)) {
    return;
  }
  jsInvoker_->invokeAsync([this, weakThis = weak_from_this(), tags = std::move(movedToRoot)](jsi::Runtime &) mutable {
    if (const auto strongThis = weakThis.lock()) {
      releaseViewTransitions_(tags, true);
    }
  });
}

bool LayoutAnimationsProxy::isInRemovedScreen(
    const std::shared_ptr<LightNode> &node,
    const ShadowViewMutationList &mutations) const {
  std::unordered_set<Tag> removedScreens;
  for (const auto &mutation : mutations) {
    const auto componentName = mutation.oldChildShadowView.componentName;
    if (mutation.type == ShadowViewMutation::Remove && componentName != nullptr &&
        !std::strcmp(componentName, "RNSScreen")) {
      removedScreens.insert(mutation.oldChildShadowView.tag);
    }
  }
  for (auto ancestor = node->parent.lock(); ancestor; ancestor = ancestor->parent.lock()) {
    if (removedScreens.contains(ancestor->current.tag)) {
      return true;
    }
  }
  return false;
}

// The push model queues the batch after the pull returns, in the same JS task. A frame that the UI thread pulls
// in between mounts before the batch, so the frames of its views wait for the next JS task.
// https://github.com/facebook/react-native/blob/v0.88.0-rc.3/packages/react-native/ReactCommon/react/renderer/runtimescheduler/RuntimeScheduler_Modern.cpp#L315-L346
void LayoutAnimationsProxy::holdFramesUntilBatchIsQueued(const ShadowViewMutationList &mutations) const {
  if (mutations.empty() || pullsOnMountThread() || worklets::isOnUIThread(uiScheduler_)) {
    return;
  }
  std::vector<Tag> tags;
  for (const auto &mutation : mutations) {
    const auto isRemoval = mutation.type == ShadowViewMutation::Remove || mutation.type == ShadowViewMutation::Delete;
    const auto tag = (isRemoval ? mutation.oldChildShadowView : mutation.newChildShadowView).tag;
    const auto hasRecord =
        layoutAnimations_.contains(tag) || completedAnimations_.contains(tag) || hasPendingLayoutAnimation(tag);
    if (hasRecord) {
      tags.push_back(tag);
      unqueuedBatchTags_[tag]++;
    }
  }
  if (tags.empty()) {
    return;
  }
  jsInvoker_->invokeAsync([this, weakThis = weak_from_this(), tags = std::move(tags)](jsi::Runtime &) {
    if (const auto strongThis = weakThis.lock()) {
      releaseFramesOfQueuedBatch(tags);
    }
  });
}

// A UI-thread pull returns before its frames enter the mount queue, so a JS-thread pull can queue the
// attach of a carrier before the last frame of the run. That frame is relative to the root and
// would move the attached view. The carrier stays detached until the UI thread runs a job that
// arrives from the JS thread, because that job runs after the frames are in the queue. The attach
// also restores the content of the carrier, so the frames of its content keep it too. One JS task
// for each frame is expensive, so the round trip starts only when a pull waits for the release or
// when a carrier does not animate.
void LayoutAnimationsProxy::keepCarriersDetachedUntilFramesAreQueued(const ShadowViewMutationList &mutations) const {
  const bool hasCarriers =
      !carrierPlacements_.atRoot().empty() || std::ranges::any_of(activeSharedTransitionRuns(), [](const auto &run) {
        return run.carrier->placement() == CarrierPlacement::NESTED;
      });
  if (!hasCarriers || pullsOnMountThread() || !worklets::isOnUIThread(uiScheduler_)) {
    return;
  }
  for (const auto &mutation : mutations) {
    const auto tag = mutation.newChildShadowView.tag;
    if (mutation.type != ShadowViewMutation::Update) {
      continue;
    }
    const auto node = lightNodes_.find(tag);
    if (node == lightNodes_.end()) {
      continue;
    }
    for (auto carrier = node->second; carrier; carrier = carrier->parent.lock()) {
      if (carrier->isCarrier()) {
        const auto carrierTag = carrier->current.tag;
        unqueuedCarrierFrames_[carrierTag]++;
        carrierFramesWithoutRelease_[carrierTag]++;
      }
    }
  }
}

void LayoutAnimationsProxy::maybeStartCarrierRelease() const {
  const bool pullWaits = std::exchange(pullWaitsForCarrierRelease_, false);
  if (carrierFramesWithoutRelease_.empty()) {
    return;
  }
  const bool startsRoundTrip = pullWaits ||
      std::ranges::any_of(carrierFramesWithoutRelease_,
                          [this](const auto &entry) { return !isCarrierAnimating(entry.first); });
  if (!startsRoundTrip) {
    return;
  }
  jsInvoker_->invokeAsync(
      [this, weakThis = weak_from_this(), frames = std::exchange(carrierFramesWithoutRelease_, {})](jsi::Runtime &) {
        const auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        scheduleOnUI(uiScheduler_, [this, weakThis, frames]() {
          if (const auto strongThis = weakThis.lock()) {
            releaseCarriersOfQueuedFrames(frames);
          }
        });
      });
}

// React Native 0.86 throws for a padding update of a deleted view. The carrier leaves its layout root before React
// deletes the root, and its views stay until its frames are in the mount queue.
void LayoutAnimationsProxy::removeCarrierBeforeQueuedFrames(
    const std::shared_ptr<LightNode> &carrier,
    ShadowViewMutationList &mutations) const {
  auto &deletes = carrierDeletesAfterQueuedFrames_.emplace_back(carrier->current.tag, ShadowViewMutationList{}).second;
  endAnimationsRecursively(carrier, deletes, mutations);
}

// The deletes go in their order, so a carrier layer goes after the carriers that were in it.
void LayoutAnimationsProxy::flushCarrierDeletesAfterQueuedFrames(ShadowViewMutationList &mutations) const {
  const auto blocked = std::ranges::find_if(
      carrierDeletesAfterQueuedFrames_, [this](const auto &entry) { return hasUnqueuedCarrierFrame(entry.first); });
  for (auto &[_, deletes] : std::ranges::subrange(carrierDeletesAfterQueuedFrames_.begin(), blocked)) {
    std::ranges::move(deletes, std::back_inserter(mutations));
  }
  carrierDeletesAfterQueuedFrames_.erase(carrierDeletesAfterQueuedFrames_.begin(), blocked);
}

void LayoutAnimationsProxy::releaseCarriersOfQueuedFrames(const std::unordered_map<Tag, int> &frames) const {
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  for (const auto &[tag, count] : frames) {
    const auto it = unqueuedCarrierFrames_.find(tag);
    if (it == unqueuedCarrierFrames_.end()) {
      continue;
    }
    it->second -= count;
    if (it->second <= 0) {
      unqueuedCarrierFrames_.erase(it);
    }
  }
  maybeScheduleCleanupPull(false);
  maybeStartCarrierRelease();
}

void LayoutAnimationsProxy::releaseFramesOfQueuedBatch(const std::vector<Tag> &tags) const {
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  bool hasHeldFrame = false;
  for (const auto tag : tags) {
    const auto it = unqueuedBatchTags_.find(tag);
    if (it == unqueuedBatchTags_.end()) {
      continue;
    }
    if (--it->second == 0) {
      unqueuedBatchTags_.erase(it);
    }
    hasHeldFrame = hasHeldFrame || updateMap_.contains(tag) || completedAnimations_.contains(tag) ||
        hasPendingLayoutAnimation(tag);
  }
  if (hasHeldFrame) {
    schedulePullOnNextFrame();
  }
}
#endif

bool LayoutAnimationsProxy::defersLayoutAnimationStart(const Tag tag) const {
  const auto run = sharedTransitionRuns_.find(tag);
  if (run != sharedTransitionRuns_.end() && run->second.lifecycle == SharedTransitionLifecycle::ACTIVE &&
      run->second.holdsStart()) {
    return true;
  }
#ifdef ANDROID
  return unqueuedBatchTags_.contains(tag);
#else
  return false;
#endif
}

// MARK: Start Animation

void LayoutAnimationsProxy::startEnteringAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  resolveLightNodeProps(node);
  const auto &insertedView = node->current;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  ManagedLayoutAnimationStart start{
      .tag = insertedView.tag,
      .type = LayoutAnimationType::ENTERING,
      .before = insertedView,
      .after = insertedView,
      .parentTag = parent->current.tag,
      .opacity = getViewProps(insertedView).opacity,
      .config = config,
  };
  if (admitsNativeEnteringStart(node, transaction) && startNativePlayback(start)) {
    return;
  }
  // The frame driver writes the initial values after the mount of the view.
  start.before = cloneViewWithoutOpacity(insertedView, propsParserContext);
  transaction.filteredMutations.push_back(
      createPropsUpdate(insertedView, start.before, start.parentTag, propsParserContext));
  enqueueLayoutAnimation(std::move(start));
}

void LayoutAnimationsProxy::startEnteringAnimationOfHiddenView(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config,
    const bool isContentFadeIn) const {
  resolveLightNodeProps(node);
  const auto &newChildShadowView = node->current;
  const auto opacity = getViewProps(newChildShadowView).opacity;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = newChildShadowView.tag,
      .type = LayoutAnimationType::ENTERING,
      .before = cloneViewWithoutOpacity(newChildShadowView, propsParserContext),
      .after = newChildShadowView,
      .parentTag = parent->current.tag,
      .opacity = opacity,
      .config = config,
      .isContentFadeIn = isContentFadeIn,
  });
}

void LayoutAnimationsProxy::startExitingAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config) const {
  resolveLightNodeProps(node);
  const auto &oldChildShadowView = node->current;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  ManagedLayoutAnimationStart start{
      .tag = oldChildShadowView.tag,
      .type = LayoutAnimationType::EXITING,
      .before = oldChildShadowView,
      .after = oldChildShadowView,
      .parentTag = parent->current.tag,
      .config = config,
  };
  if (admitsNativeStart(node, start.type) && startNativePlayback(start)) {
    return;
  }
  continueOnFrameDriver(start);
  enqueueLayoutAnimation(std::move(start));
}

void LayoutAnimationsProxy::startLayoutAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config,
    const ShadowView &before,
    TransactionMeta &transaction) const {
  if (const auto staleTag = staleSynchronousProps_.find(node, LayoutAnimationType::LAYOUT)) {
    warnAboutStaleSynchronousProps(node->current.tag, *staleTag, LayoutAnimationType::LAYOUT);
  }
  resolveLightNodeProps(node);
  const auto tag = node->current.tag;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  ManagedLayoutAnimationStart start{
      .tag = tag,
      .type = LayoutAnimationType::LAYOUT,
      .before = before,
      .after = node->current,
      .parentTag = parent->current.tag,
      .config = config,
  };
  if (admitsNativeStart(node, start.type) && startNativePlayback(start)) {
    transaction.filteredMutations.push_back(
        ShadowViewMutation::UpdateMutation(start.before, start.after, start.parentTag));
    return;
  }
  continueOnFrameDriver(start);
  enqueueLayoutAnimation(std::move(start));
}

void LayoutAnimationsProxy::startSharedTransition(
    SharedTransitionRun &run,
    const ShadowView &before,
    const ShadowView &after,
    const Props::Shared &frameProps,
    const std::shared_ptr<Serializable> &config,
    const std::optional<ContentOpacityRange> contentOpacity,
    const std::optional<AncestorClipRange> clip) const {
  const auto &carrier = run.carrier;
  takeTargetScroll(run);
  cancelNativeLayoutAnimation(carrier->current.tag);
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = carrier->current.tag,
      .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION,
      .before = before,
      .after = after,
      .frameProps = frameProps,
      .parentTag = carrierParentTag(carrier),
      .config = config,
      .contentOpacity = contentOpacity,
      .clip = clip,
  });
}

void LayoutAnimationsProxy::startProgressTransition(
    const std::shared_ptr<LightNode> &carrier,
    const ShadowView &before,
    const ShadowView &after,
    const Props::Shared &frameProps,
    const std::shared_ptr<Serializable> &config) const {
  cancelNativeLayoutAnimation(carrier->current.tag);
  enqueueLayoutAnimation(ProgressLayoutAnimationStart{
      .tag = carrier->current.tag,
      .before = before,
      .after = after,
      .frameProps = frameProps,
      .parentTag = carrierParentTag(carrier),
      .config = config,
  });
}

} // namespace reanimated
