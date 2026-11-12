#include <react/debug/react_native_assert.h>
#include <react/renderer/mounting/Differentiator.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <react/utils/LowPriorityExecutor.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <worklets/Compat/StableApi.h>

#ifdef ANDROID
#include <reanimated/Compat/ReactNativeFeatureFlagsCompat.h>
#endif // ANDROID

#include <algorithm>
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
      scheduleOnNextUIFrame_(dependencies.scheduleOnNextUIFrame) {
#ifdef __APPLE__
  forceScreenSnapshot_ = dependencies.forceScreenSnapshot;
  setSharedTransitionOverlay_ = dependencies.setSharedTransitionOverlay;
  nativeViewPlacement_ = dependencies.nativeViewPlacement;
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
    return animationIt->second.currentView;
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end()) {
    return completedAnimationIt->second.animation.currentView;
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
    return animation.currentView;
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end() && !completedAnimationIt->second.shouldRemove) {
    auto &animation = completedAnimationIt->second.animation;
    animation.parentTag = parentTag;
    animation.currentView.layoutMetrics.frame.origin += offset;
    if (animation.geometryProgress) {
      animation.startView.layoutMetrics.frame.origin += offset;
    }
    moveLayoutAnimationTarget(tag, animation, newView, offset);
    return animation.currentView;
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
  react_native_assert(surfaceId == surfaceId_ && "pull routed to the wrong surface's proxy");
  assertUpdatesRegistryUnlocked();
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
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
    const auto snapshotTags = activeBoundaryMayHaveChanged_ ? std::nullopt : sharedTagsAffectedBy(mutations);
    auto beforeTopScreen = topScreen_;
    if (beforeTopScreen) {
      ReanimatedSystraceSection s("find before elements");
      findSharedElements(beforeTopScreen, BEFORE, snapshotTags, transaction);
    }

    updateLightTree(propsParserContext, mutations, transaction);

    react_native_assert(
        (activeBoundaryMayHaveChanged_ || findActiveBoundary(root) == topScreen_) &&
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
    followOffWindowTargets(transaction, propsParserContext);
    flushSubtreeRemovals(transaction);
    scheduleTransitionLifecycleCleanup();
    retireOrphanedSharedTransitions();
    holdTargetEntering(transaction, propsParserContext);
  }
  for (const auto &[node, config] : transaction.entering) {
    startEnteringAnimation(node, config);
  }
  for (const auto &[node, config] : transaction.layout) {
    startLayoutAnimation(node, config);
  }
  for (const auto &[node, config] : transaction.exiting) {
    startExitingAnimation(node, config);
  }

  filteredMutations.insert(
      filteredMutations.end(), transaction.teardownMutations.begin(), transaction.teardownMutations.end());

  collectDueRemovals(transaction);
  if (flushStructuralMutations) {
    tearDown(transaction.dueRemovals, filteredMutations);
  }

  configLock.unlock();
  flushLayoutAnimationOperations(lock);

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (commits) {
      followSharedTransitionTargets(propsParserContext, false);
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
  releaseDroppedViews();
#ifdef ANDROID
  releaseViewTransitionsOfMovedCarriers(filteredMutations);
  holdFramesUntilBatchIsQueued(filteredMutations);
  keepCarriersDetachedUntilFramesAreQueued(filteredMutations);
#endif
  eraseFinishedSharedTransitionRuns();
  return MountingTransaction{surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
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
    unmappedContentFadeTags_.insert(node->current.tag);
    if (deferredSharedTransitionConfigReleases_.erase(node->current.tag)) {
      layoutAnimationsManager_->clearSharedTransitionConfigs({node->current.tag});
    }
  }
  forgetHiddenView(node->current.tag);
  coveredTopBoundaries_.erase(node->current.tag);
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
        node->placement() == CarrierPlacement::AT_ROOT ? carrierHostTag(node)
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
  std::unordered_set<Tag> inserted, moved, deleted;
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
        // Without layout configs and animation records, every lookup below finds nothing, so the
        // update goes through as it is. Checked per mutation, as an Insert can transfer a config.
        const bool mayAnimate = !node->isCarrier() &&
            (hasLayoutAnimationRecords() || layoutAnimationsManager_->hasLayoutAnimationConfigs(LAYOUT));
        std::shared_ptr<Serializable> config;
        auto shouldAnimate = false;
        if (mayAnimate) {
          config = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LAYOUT);
          if (!config) {
            config = getRetargetLayoutAnimationConfig(tag);
          }
          shouldAnimate = hasLayoutChanged(mutation);
        }
        Props::Shared previousProps;
        if (config && shouldAnimate) {
          resolveLightNodeProps(node);
          previousProps = node->current.props;
        }
        updateLightNodeProps(node, mutation.oldChildShadowView, mutation.newChildShadowView);
        if (previousProps) {
          node->previous.props = previousProps;
        }
        if (mutation.oldChildShadowView.props != mutation.newChildShadowView.props) {
          staleSynchronousProps_.forget(tag);
        }
        // The shared transition owns the mounted props and frame of its carrier.
        // attachCarrier mounts React props and synchronous updates from the light node.
        if (node->isCarrier()) {
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
          transaction.layout.push_back({node, config});
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
          node->previous.layoutMetrics.frame.origin += offset;
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
          } else if (hasPendingLayoutAnimation(tag)) {
            filteredMutations.push_back(
                ShadowViewMutation::InsertMutation(mutation.parentTag, node->previous, hostIndex));
          } else {
            auto view = mutation.newChildShadowView;
            const auto updatedViewIt = updatedViews.find(tag);
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
          filteredMutations.push_back(createPropsUpdate(
              mutation.newChildShadowView,
              cloneViewWithoutOpacity(mutation.newChildShadowView, propsParserContext),
              mutation.parentTag,
              propsParserContext));
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
            unmappedContentFadeTags_.insert(tag);
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
  droppedViews_.push_back(std::move(node->previous));
  node->previous = oldView;
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
  const auto mountingCoordinator = shadowTree.getMountingCoordinator();
  mountingCoordinator->setMountingOverrideDelegate(std::move(mountingOverrideDelegate));
  // The delegate must be set before the base revision is read, so that every
  // transaction is either contained in the revision or buffered by the proxy.
  initializeLightTree(mountingCoordinator->getBaseRevision());
}

void LayoutAnimationsProxy::releaseDroppedViews() const {
  if (droppedViews_.empty()) {
    return;
  }
  // shared_ptr, because on iOS the executor copies the callable on this thread
  LowPriorityExecutor::execute(
      [views = std::make_shared<std::vector<ShadowView>>(std::exchange(droppedViews_, {}))]() {});
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
  releaseDroppedViews();
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

  completedAnimations_.insert_or_assign(
      tag, CompletedLayoutAnimation{.animation = layoutAnimationIt->second, .shouldRemove = shouldRemove});
  layoutAnimations_.erase(layoutAnimationIt);

  if (!shouldRemove) {
    return surfaceId_;
  }

  const auto nodeIt = lightNodes_.find(tag);
  // the withheld removal may have already been flushed (e.g. reconciled after
  // React re-created the tag) — the assert alone is compiled out in release
  // and operator[] would insert a null node here
  if (nodeIt == lightNodes_.end() || !nodeIt->second) {
    react_native_assert(false && "LightNode not found");
    return surfaceId_;
  }
  nodeIt->second->setExitingState(COMPLETED);

  return surfaceId_;
}

// A subtree that animates keeps its place in the host tree, so nothing is emitted for its root.
// A subtree that does not animate is removed at its current host index after its descendants, like React
// removes it. On iOS a subtree that holds a screen React Native Screens snapshots is removed before its
// descendants instead, and their teardown mounts at the end of the transaction.
void LayoutAnimationsProxy::handleSubtreeRemoval(const std::shared_ptr<LightNode> &node, TransactionMeta &transaction)
    const {
  ReanimatedSystraceSection s("handleSubtreeRemoval");
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (!transaction.surfaceDropped) {
      moveNestedCarriersOutOf(node, transaction);
    }
    removeCarriersHostedIn(node, transaction);
    retainRemovedCarriers(node, transaction);
    if (node->presence() == ReactPresence::REMOVED) {
      return;
    }
  }
  const bool defersTeardown = holdsSnapshottedScreen(node);
#ifdef __APPLE__
  if (!defersTeardown && holdsSourceInModal(node, transaction)) {
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
    const bool removeBeforeChildren = defersTeardown && root == node;
    if (removeBeforeChildren && !transaction.screenSnapshotRemoval) {
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

#ifdef __APPLE__
// React Native animates a modal that it removes while presented from a snapshot of what the screen shows, which lags a
// mount by up to two frames. A modal that holds the source of a transition stays mounted until 34 ms, two frames of a
// 60 Hz display, after the mount that hides the source.
bool LayoutAnimationsProxy::holdsSourceInModal(
    const std::shared_ptr<LightNode> &node,
    const TransactionMeta &transaction) const {
  return std::ranges::any_of(transaction.transitionMap, [&](const auto &entry) {
    bool insideModal = false;
    for (const auto &ancestor : entry.second.ancestors[BEFORE]) {
      const auto ancestorIt = lightNodes_.find(ancestor.tag);
      if (ancestorIt == lightNodes_.end()) {
        return false;
      }
      insideModal = insideModal || !strcmp(ancestorIt->second->current.componentName, "ModalHostView");
      if (ancestorIt->second == node) {
        return insideModal;
      }
    }
    return false;
  });
}
#endif

// A UI-thread pull on Android must not update the views that the next flushing pull removes, because
// Android can mount that JS-thread pull first.
void LayoutAnimationsProxy::collectDueRemovals(TransactionMeta &transaction) const {
  std::vector<std::shared_ptr<LightNode>> finishedExits;
  for (const auto &[tag, completedAnimation] : completedAnimations_) {
    const auto nodeIt = lightNodes_.find(tag);
    if (!completedAnimation.shouldRemove || hasPendingLayoutAnimation(tag) || nodeIt == lightNodes_.end() ||
        nodeIt->second->state != COMPLETED || isRetainedContent(nodeIt->second)) {
      continue;
    }
    finishedExits.push_back(nodeIt->second);
  }
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
      finishedExits.push_back(held.node);
      return true;
    }
    schedulePullOnNextFrame();
    return false;
  });
#endif
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
  [[maybe_unused]] const auto mutationCount = mutations.size();
  for (const auto &root : roots) {
    endAnimationsRecursively(root, mutations, mutations);
  }
  react_native_assert(
      mutations.size() - mutationCount == 2 * removals.size() &&
      std::ranges::none_of(removals, [this](const Tag tag) { return lightNodes_.contains(tag); }) &&
      "The teardown must remove exactly the removals");
}

void LayoutAnimationsProxy::addOngoingAnimations(TransactionMeta &transaction) const {
  ReanimatedSystraceSection s1("addOngoingAnimations");
  auto &mutations = transaction.filteredMutations;
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
#ifdef ANDROID
  std::optional<std::unique_ptr<int[]>> maybeCorrectedTags;

  if (!isMountingCoordinatorPullModelEnabled()) {
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
    if (layoutAnimationIt == layoutAnimations_.end()) {
      if (completedAnimationIt == completedAnimations_.end()) {
        continue;
      }
      if (completedAnimationIt->second.shouldRemove) {
        const auto node = lightNodes_.find(tag);
        if (node == lightNodes_.end() || !isRetainedContent(node->second)) {
          continue;
        }
      }
    }

    auto &layoutAnimation = layoutAnimationIt != layoutAnimations_.end() ? layoutAnimationIt->second
                                                                         : completedAnimationIt->second.animation;
    auto newView = layoutAnimation.finalView;
    newView.props = updateValues.newProps ? updateValues.newProps : layoutAnimation.framePropsBase();
    updateLayoutMetrics(newView.layoutMetrics, updateValues.frame, layoutAnimation.frameOffset);

    mutations.push_back(
        layoutAnimation.frameProps || layoutAnimation.type == LayoutAnimationType::EXITING
            ? createPropsUpdate(layoutAnimation.currentView, newView, layoutAnimation.parentTag, propsParserContext)
            : ShadowViewMutation::UpdateMutation(layoutAnimation.currentView, newView, layoutAnimation.parentTag));
    layoutAnimation.currentView = newView;
    if (layoutAnimation.opacity &&
        (updateValues.animatesOpacity || getViewProps(newView).opacity == *layoutAnimation.opacity)) {
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

void LayoutAnimationsProxy::shadowTreeWillCommit(const bool isSurfaceRemoval) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  surfaceToRemove_ = isSurfaceRemoval;
}

void LayoutAnimationsProxy::clearSurfaceState() const {
  LayoutAnimationsProxyCommon::clearSurfaceState();
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
#ifdef __APPLE__
    react_native_assert(!carrierOverlay_ && "The last pull of a surface deletes its overlay");
#endif
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
  carrierDeletesAfterQueuedFrames_.clear();
#endif
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
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
  return isMountingCoordinatorPullModelEnabled() || !worklets::isOnUIThread(uiScheduler_);
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
  cleanupCompletedAnimations(transaction.filteredMutations, propsParserContext, true, preservedTags);
#ifdef ANDROID
  if (flushStructuralMutations) {
    flushCarrierDeletesAfterQueuedFrames(transaction.filteredMutations);
  }
#endif
}

bool LayoutAnimationsProxy::hasUnqueuedCarrierFrame([[maybe_unused]] const Tag tag) const {
#ifdef ANDROID
  return unqueuedCarrierFrames_.contains(tag);
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
  if (std::ranges::any_of(carrierDeletesAfterQueuedFrames_, [this](const auto &entry) {
        return !hasUnqueuedCarrierFrame(entry.first);
      })) {
    return true;
  }
  const auto coveringViews = viewsHiddenByContinuingRuns();
  return std::ranges::any_of(completedAnimations_, [&](const auto &entry) {
    const auto &[tag, completedAnimation] = entry;
    const auto node = lightNodes_.find(tag);
    const bool removesContent =
        completedAnimation.shouldRemove && (node == lightNodes_.end() || !isRetainedContent(node->second));
    return !hasPendingLayoutAnimation(tag) && (removesContent || isCarrierOfUncoveredRun(tag, coveringViews));
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
          mutation.parentTag == carrierHostTag(nodeIt->second)) {
        movedToRoot.push_back(tag);
      }
    }
  }
  if (movedToRoot.empty()) {
    return;
  }
  releaseViewTransitions_(movedToRoot, false);
  if (isMountingCoordinatorPullModelEnabled() || worklets::isOnUIThread(uiScheduler_)) {
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
  if (mutations.empty() || isMountingCoordinatorPullModelEnabled() || worklets::isOnUIThread(uiScheduler_)) {
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
// also restores the content of the carrier, so the frames of its content keep it too.
void LayoutAnimationsProxy::keepCarriersDetachedUntilFramesAreQueued(const ShadowViewMutationList &mutations) const {
  const bool hasCarriers =
      !carrierPlacements_.atRoot().empty() || std::ranges::any_of(activeSharedTransitionRuns(), [](const auto &run) {
        return run.carrier->placement() == CarrierPlacement::NESTED;
      });
  if (!hasCarriers || isMountingCoordinatorPullModelEnabled() || !worklets::isOnUIThread(uiScheduler_)) {
    return;
  }
  std::vector<Tag> tags;
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
        tags.push_back(carrierTag);
        unqueuedCarrierFrames_[carrierTag]++;
      }
    }
  }
  if (tags.empty()) {
    return;
  }
  jsInvoker_->invokeAsync([this, weakThis = weak_from_this(), tags = std::move(tags)](jsi::Runtime &) {
    const auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    scheduleOnUI(uiScheduler_, [this, weakThis, tags]() {
      if (const auto strongThis = weakThis.lock()) {
        releaseCarriersOfQueuedFrames(tags);
      }
    });
  });
}

// React Native 0.86 throws for a padding update of a deleted view. The carrier leaves its layout root before React
// deletes the root, and its views stay until its frames are in the mount queue.
void LayoutAnimationsProxy::removeCarrierBeforeQueuedFrames(
    const std::shared_ptr<LightNode> &carrier,
    ShadowViewMutationList &mutations) const {
  const auto tag = carrier->current.tag;
  ShadowViewMutationList deletes;
  endAnimationsRecursively(carrier, deletes, mutations);
  carrierDeletesAfterQueuedFrames_.emplace_back(tag, std::move(deletes));
}

void LayoutAnimationsProxy::flushCarrierDeletesAfterQueuedFrames(ShadowViewMutationList &mutations) const {
  std::erase_if(carrierDeletesAfterQueuedFrames_, [&](auto &entry) {
    auto &[tag, deletes] = entry;
    if (hasUnqueuedCarrierFrame(tag)) {
      return false;
    }
    std::ranges::move(deletes, std::back_inserter(mutations));
    return true;
  });
}

void LayoutAnimationsProxy::releaseCarriersOfQueuedFrames(const std::vector<Tag> &tags) const {
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  for (const auto tag : tags) {
    const auto it = unqueuedCarrierFrames_.find(tag);
    if (it != unqueuedCarrierFrames_.end() && --it->second == 0) {
      unqueuedCarrierFrames_.erase(it);
    }
  }
  maybeScheduleCleanupPull(false);
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
    const auto completedIt = completedAnimations_.find(tag);
    const auto waitsForCleanup = completedIt != completedAnimations_.end() && !completedIt->second.shouldRemove;
    hasHeldFrame = hasHeldFrame || updateMap_.contains(tag) || waitsForCleanup || hasPendingLayoutAnimation(tag);
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
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = oldChildShadowView.tag,
      .type = LayoutAnimationType::EXITING,
      .before = oldChildShadowView,
      .after = oldChildShadowView,
      .parentTag = parent->current.tag,
      .config = config,
  });
}

void LayoutAnimationsProxy::startLayoutAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config) const {
  if (const auto staleTag = staleSynchronousProps_.find(node, LayoutAnimationType::LAYOUT)) {
    warnAboutStaleSynchronousProps(node->current.tag, *staleTag, LayoutAnimationType::LAYOUT);
  }
  resolveLightNodeProps(node);
  const auto &oldChildShadowView = node->previous;
  const auto &newChildShadowView = node->current;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = oldChildShadowView.tag,
      .type = LayoutAnimationType::LAYOUT,
      .before = oldChildShadowView,
      .after = newChildShadowView,
      .parentTag = parent->current.tag,
      .config = config,
  });
}

void LayoutAnimationsProxy::startSharedTransition(
    const std::shared_ptr<LightNode> &carrier,
    const ShadowView &before,
    const ShadowView &after,
    const Props::Shared &frameProps,
    const std::shared_ptr<Serializable> &config,
    const std::optional<ContentOpacityRange> contentOpacity) const {
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = carrier->current.tag,
      .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION,
      .before = before,
      .after = after,
      .frameProps = frameProps,
      .parentTag = carrierParentTag(carrier),
      .config = config,
      .contentOpacity = contentOpacity,
  });
}

void LayoutAnimationsProxy::startProgressTransition(
    const std::shared_ptr<LightNode> &carrier,
    const ShadowView &before,
    const ShadowView &after,
    const Props::Shared &frameProps,
    const std::shared_ptr<Serializable> &config) const {
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
