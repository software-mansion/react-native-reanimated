#include <react/debug/react_native_assert.h>
#include <react/renderer/mounting/Differentiator.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>
#include <reanimated/LayoutAnimations/PropsDiffer.h>
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
      sharedTransitionManager_(dependencies.layoutAnimationsManager->getSharedTransitionManager()) {
#ifdef __APPLE__
  forceScreenSnapshot_ = dependencies.forceScreenSnapshot;
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
    animation.frameOffset += offset;
    animation.finalView = newView;
    return animation.currentView;
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end() && !completedAnimationIt->second.shouldRemove) {
    auto &animation = completedAnimationIt->second.animation;
    animation.parentTag = parentTag;
    animation.currentView.layoutMetrics.frame.origin += offset;
    animation.frameOffset += offset;
    animation.finalView = newView;
    return animation.currentView;
  }
  return pendingCurrentView;
}

// MARK: MountingOverrideDelegate

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
  ReanimatedSystraceSection d("pullTransaction");
  react_native_assert(surfaceId == surfaceId_ && "pull routed to the wrong surface's proxy");
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
  auto rootChildCount = static_cast<int>(lightNodes_[surfaceId_]->children.size());
  const bool flushStructuralMutations = shouldFlushStructuralMutations();

  reconcileContradictedRemovals(mutations, filteredMutations);

  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (!mutations.empty()) {
      updateLightTree(propsParserContext, mutations, transaction);
    }
  } else if (transition_ || uncommittedScreenPop_) {
    updateLightTree(propsParserContext, mutations, transaction);
    resolveTransitionLifecycle(transaction, mutations, propsParserContext);
  } else if (!mutations.empty()) {
    auto root = lightNodes_[surfaceId_];
    react_native_assert(root && "Root node not found");
    auto beforeTopScreen = topScreen_;
    if (beforeTopScreen) {
      ReanimatedSystraceSection s("find before elements");
      findSharedElementsOnScreen(beforeTopScreen, BEFORE, transaction);
    }

    updateLightTree(propsParserContext, mutations, transaction);

    auto afterTopScreen = findActiveBoundary(root);
    topScreen_ = afterTopScreen;
    if (afterTopScreen) {
      ReanimatedSystraceSection s("find after elements");
      findSharedElementsOnScreen(afterTopScreen, AFTER, transaction);
#ifdef __APPLE__
      // TODO (future): this is a temporary workaround for RNScreens on iOS,
      // which takes the snapshot of the popped screen before we hide the
      // shared element, the issue should be gone with the new stack
      // implementation
      if (auto screen = findParentRNSScreen(afterTopScreen)) {
        forceScreenSnapshot_(screen->current.tag);
      }
#endif
    }
    const bool hasScreenChanged = beforeTopScreen && afterTopScreen && beforeTopScreen != afterTopScreen;

    if (hasScreenChanged) {
      hideTransitioningViews(BEFORE, transaction, propsParserContext);
      hideTransitioningViews(AFTER, transaction, propsParserContext);
    }

    handleSharedTransitionsStart(afterTopScreen, beforeTopScreen, transaction, mutations, propsParserContext);
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

  if (flushStructuralMutations) {
    flushCompletedRemovals(filteredMutations);
  }

  configLock.unlock();
  flushLayoutAnimationOperations(lock);

  addOngoingAnimations(filteredMutations);

  cleanupAnimations(transaction, propsParserContext, flushStructuralMutations);

#ifdef ANDROID
  maybeScheduleCleanupPull(flushStructuralMutations);
#endif

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    insertContainers(transaction, rootChildCount);
  }

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    keepTransitioningViewsHidden(filteredMutations, propsParserContext);
  }

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
  lightNodes_.erase(it);
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

// If React re-creates or re-inserts a tag whose exiting removal we are still
// withholding, it has contradicted that withheld removal. Flush it now instead
// of letting the stale node linger: updateLightTree would overwrite its
// lightNodes_ entry, orphaning the still-mounted exiting view, and the eventual
// removal flush would then remove the wrong, live view and crash the
// mounting layer.
//
// This must run before updateLightTree (so the tag is re-registered cleanly)
// and before addOngoingAnimations (which would otherwise emit an Update for a
// tag we are about to Delete this frame). It only sees nodes that were already
// exiting when the transaction arrived; a node that starts exiting inside this
// transaction is contradicted by the Create handler in updateLightTree.
void LayoutAnimationsProxy::reconcileContradictedRemovals(
    const ShadowViewMutationList &mutations,
    ShadowViewMutationList &filteredMutations) const {
  for (const auto &mutation : mutations) {
    if (mutation.type != ShadowViewMutation::Type::Create && mutation.type != ShadowViewMutation::Type::Insert) {
      continue;
    }
    const auto it = lightNodes_.find(mutation.newChildShadowView.tag);
    if (it == lightNodes_.end() || it->second->state == UNDEFINED) {
      continue;
    }
    const auto node = it->second;
    forgetContradictedNode(node);
    dropContradictedNode(node, filteredMutations);
  }
}

// Drops every record the proxy keeps under the contradicted tag. It has to run
// before the new view claims that tag: a record left behind resolves by tag
// alone, so endLayoutAnimation would later mark the new, live node DEAD and the
// next Delete for it would hit "Delete mutation for an unmounted node".
void LayoutAnimationsProxy::forgetContradictedNode(const std::shared_ptr<LightNode> &node) const {
  const auto tag = node->current.tag;
  completedAnimations_.erase(tag);
  updateMap_.erase(tag);
  cancelLayoutAnimation(tag);
  unmapLightNode(node);
}

// Unmounts whatever is left of the contradicted node. Always runs after
// forgetContradictedNode, and never while the per-parent index cursors of
// updateLightTree are live, because it edits a parent's children.
void LayoutAnimationsProxy::dropContradictedNode(
    const std::shared_ptr<LightNode> &node,
    ShadowViewMutationList &filteredMutations) const {
  if (node->state == DELETED) {
    // already unmounted — only the stale records had to go
    return;
  }
  const auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  if (!parent) {
    return;
  }
  const auto index = parent->removeChild(node);
  react_native_assert(index != -1 && "Exiting node not found");
  if (index == -1) {
    return;
  }
  endAnimationsRecursively(node, index, filteredMutations);
  maybeDropAncestors(parent, filteredMutations);
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  // we need to listen to every possible mutation to keep the light tree updated
  return true;
}

// MARK: Light Tree

void LayoutAnimationsProxy::updateLightTree(
    const PropsParserContext &propsParserContext,
    const ShadowViewMutationList &mutations,
    TransactionMeta &transaction) const {
  ReanimatedSystraceSection s("updateLightTree");
  auto &filteredMutations = transaction.filteredMutations;
  std::unordered_set<Tag> inserted, moved, deleted;
  std::unordered_map<Tag, IndexCursors> indexCursors;
  std::unordered_map<Tag, ShadowView> updatedViews;
  std::unordered_map<Tag, std::vector<AncestorOrigin>> oldChains;
  std::vector<std::shared_ptr<LightNode>> contradictedNodes;
  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    const auto &mutation = *it;
    switch (mutation.type) {
      case ShadowViewMutation::Delete: {
        deleted.insert(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Update: {
        updatedViews.insert_or_assign(mutation.newChildShadowView.tag, mutation.oldChildShadowView);
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

  for (const auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation);
    switch (mutation.type) {
      case ShadowViewMutation::Update: {
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        react_native_assert(node && "LightNode not found");
        updateLightNodeProps(node, mutation.oldChildShadowView, mutation.newChildShadowView);
        auto tag = mutation.newChildShadowView.tag;
        if (mutation.oldChildShadowView.props != mutation.newChildShadowView.props) {
          staleSynchronousProps_.forget(tag);
        }
        auto config = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LAYOUT);
        if (!config) {
          config = getRetargetLayoutAnimationConfig(tag);
        }
        const auto shouldAnimate = hasLayoutChanged(mutation);
        if ((!config || !shouldAnimate) && updateEnteringAnimationTarget(tag, node->current)) {
          break;
        }
        if (config && shouldAnimate) {
          transaction.layout.push_back({node, config});
        } else if (config && (layoutAnimations_.contains(tag) || hasPendingLayoutAnimation(tag))) {
          updateLayoutAnimationTarget(tag, node->current, config);
        } else {
          if (const auto currentView = takeCompletedLayoutAnimationView(tag)) {
            filteredMutations.push_back(
                ShadowViewMutation::UpdateMutation(*currentView, node->current, mutation.parentTag));
          } else {
            filteredMutations.push_back(mutation);
          }
        }
        break;
      }
      case ShadowViewMutation::Create: {
        const auto tag = mutation.newChildShadowView.tag;
        const auto &node = std::make_shared<LightNode>();
        node->current = mutation.newChildShadowView;
        // React reuses a tag when a view unflattens, and it can flatten and
        // unflatten the same view within one transaction. reconcileContradictedRemovals
        // ran before this loop, so it cannot see a node that started exiting a few
        // mutations ago. Hand the tag over here rather than letting the new node
        // overwrite the entry of a still-mounted exiting one.
        if (const auto contradictedIt = lightNodes_.find(tag); contradictedIt != lightNodes_.end()) {
          const auto contradicted = contradictedIt->second;
          react_native_assert(contradicted->isExiting() && "Create mutation for a live node");
          forgetContradictedNode(contradicted);
          contradictedNodes.push_back(contradicted);
        }

        if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
          hiddenViewTags_.erase(tag);
        }
        lightNodes_[tag] = node;
        staleSynchronousProps_.forget(tag);
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Delete: {
        const auto it = lightNodes_.find(mutation.oldChildShadowView.tag);
        react_native_assert(it != lightNodes_.end() && "Delete mutation for an unknown node");
        const auto state = it->second->state;
        react_native_assert(
            (state == UNDEFINED || state == WAITING || state == ANIMATING) && "Delete mutation for an unmounted node");
        if (state == UNDEFINED) {
          const auto node = it->second;
          unmapLightNode(node);
        }
        staleSynchronousProps_.forget(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Insert: {
        transferConfigFromNativeID(mutation.newChildShadowView.props->nativeId, mutation.newChildShadowView.tag);
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        auto &parent = lightNodes_[mutation.parentTag];
        const auto hostIndex = parent->toHostIndexForInsert(mutation.index, indexCursors[mutation.parentTag]);
        parent->children.insert(parent->children.begin() + hostIndex, node);
        node->parent = parent;
        const auto tag = mutation.newChildShadowView.tag;
        bool hasSharedTransition = false;
        if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
          auto sharedTransitionLock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
          hasSharedTransition = sharedTransitionManager_->tagToName_.contains(tag);
        }
        const auto layoutConfig = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LAYOUT);
        const auto enteringConfig = layoutAnimationsManager_->getLayoutAnimationConfig(tag, ENTERING);
        if (moved.contains(tag)) {
          const auto offset = reparentOffset(oldChains.at(tag), ancestorOrigins(parent, {}));
          node->previous.layoutMetrics.frame.origin += offset;
          if (const auto currentView = reparentLayoutAnimation(tag, mutation.parentTag, node->current, offset)) {
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
            filteredMutations.push_back(
                ShadowViewMutation::InsertMutation(mutation.parentTag, mutation.newChildShadowView, hostIndex));
          }
        } else if (enteringConfig) {
          transaction.entering.push_back({node, enteringConfig});
          filteredMutations.push_back(
              ShadowViewMutation::InsertMutation(mutation.parentTag, mutation.newChildShadowView, hostIndex));
          auto hiddenView = cloneViewWithoutOpacity(mutation.newChildShadowView, propsParserContext);
          filteredMutations.push_back(
              ShadowViewMutation::UpdateMutation(mutation.newChildShadowView, hiddenView, mutation.parentTag));
        } else if (hasSharedTransition && isInsideInactiveBoundary(node)) {
          filteredMutations.push_back(
              ShadowViewMutation::InsertMutation(mutation.parentTag, mutation.newChildShadowView, hostIndex));
          auto hiddenView = cloneViewWithoutOpacity(mutation.newChildShadowView, propsParserContext);
          filteredMutations.push_back(
              ShadowViewMutation::UpdateMutation(mutation.newChildShadowView, hiddenView, mutation.parentTag));
        } else {
          filteredMutations.push_back(
              ShadowViewMutation::InsertMutation(mutation.parentTag, mutation.newChildShadowView, hostIndex));
        }
        break;
      }
      case ShadowViewMutation::Remove: {
        const auto &node = lightNodes_[mutation.oldChildShadowView.tag];
        const auto tag = node->current.tag;
        const auto parentTag = mutation.parentTag;
        const auto &parent = lightNodes_[parentTag];
        const auto hostIndex = parent->toHostIndexForRemove(mutation.index, indexCursors[parentTag]);
        react_native_assert(
            hostIndex < static_cast<int>(parent->children.size()) &&
            parent->children[hostIndex]->current.tag == mutation.oldChildShadowView.tag &&
            "Indices are wrong in Remove mutation");

        if (!deleted.contains(tag)) {
          react_native_assert(!node->isExiting() && "Remove mutation for an exiting node");
          if (moved.contains(tag)) {
            oldChains[tag] = ancestorOrigins(parent, updatedViews);
          }
          filteredMutations.push_back(
              ShadowViewMutation::RemoveMutation(parentTag, mutation.oldChildShadowView, hostIndex));
          parent->children.erase(parent->children.begin() + hostIndex);
        } else if (!deleted.contains(parentTag)) {
          handleSubtreeRemoval(node, parent, hostIndex, transaction);
        }
        break;
      }
      default: {
        react_native_assert(false && "Unsupported mutation type");
        break;
      }
    }
  }

  // Deferred until the loop is over: dropping a node edits its parent's
  // children, which would invalidate the index cursors cached per parent above.
  for (const auto &node : contradictedNodes) {
    dropContradictedNode(node, filteredMutations);
  }
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
        break;
      }
      case ShadowViewMutation::Delete: {
        lightNodes_.erase(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Insert: {
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        auto &parent = lightNodes_[mutation.parentTag];
        react_native_assert(node && parent && "LightNode not found");
        parent->children.insert(parent->children.begin() + mutation.index, node);
        node->parent = parent;
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
  node->accumulatedRawProps.update(newView.props->rawProps);
  node->propsNeedResolve = true;
#endif // ANDROID
}

void LayoutAnimationsProxy::resolveLightNodeProps(const std::shared_ptr<LightNode> &node) const {
#ifdef ANDROID
  if (!node->propsNeedResolve) {
    return;
  }
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  node->current.props = componentDescriptorRegistry_->at(node->current.componentHandle)
                            .cloneProps(propsParserContext, node->current.props, RawProps(node->accumulatedRawProps));
  node->propsNeedResolve = false;
#endif // ANDROID
}

// Synchronous prop updates skip pullTransaction. Animation records always take the
// values; light nodes take them only while the dynamic flag is on.
void LayoutAnimationsProxy::applySynchronousProps(const UpdatesBatch &updatesBatch, const bool trackInLightTree) const {
  ReanimatedSystraceSection s("applySynchronousProps");
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const bool hasRecords = hasLayoutAnimationRecords();

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
    if (!trackInLightTree) {
      staleSynchronousProps_.record(tag, props);
      continue;
    }

    react_native_assert(node->current.props && "LightNode has no props");
    staleSynchronousProps_.forget(tag, props);
#ifdef ANDROID
    if (node->accumulatedRawProps.isNull()) {
      node->accumulatedRawProps = node->current.props->rawProps;
    }
    node->accumulatedRawProps.update(props);
    node->propsNeedResolve = true;
    resolveLightNodeProps(node);
#else
    node->current.props = mergeSynchronousProps(node->current, props);
#endif
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

void LayoutAnimationsProxy::initializeLightTree(const ShadowTreeRevision &baseRevision) {
  ShadowViewMutationList initialMutations;
  if (baseRevision.rootShadowNode) {
    const auto emptyRoot =
        baseRevision.rootShadowNode->ShadowNode::clone({.children = ShadowNode::emptySharedShadowNodeSharedList()});
    initialMutations = calculateShadowViewMutations(*emptyRoot, *baseRevision.rootShadowNode);
  }

  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  react_native_assert(!isLightTreeInitialized() && "Light tree is already initialized");
  if (baseRevision.rootShadowNode) {
    const auto &size = baseRevision.rootShadowNode->getLayoutMetrics().frame.size;
    window_ = {size.width, size.height};
  }
  const auto root = std::make_shared<LightNode>();
  root->current.componentName = "RootView";
  root->current.tag = surfaceId_;
  root->current.props = std::make_shared<BaseViewProps>();
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
}

// MARK: Layout Animation Updates

std::optional<SurfaceId> LayoutAnimationsProxy::endLayoutAnimation(int tag, bool shouldRemove) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  std::shared_ptr<LightNode> exitingNode;
  if (shouldRemove) {
    const auto nodeIt = lightNodes_.find(tag);
    // the withheld removal may have already been flushed (e.g. reconciled after
    // React re-created the tag) — the assert alone is compiled out in release
    // and operator[] would insert a null node here
    if (nodeIt == lightNodes_.end() || !nodeIt->second) {
      react_native_assert(false && "LightNode not found");
    } else if (nodeIt->second->isExiting()) {
      exitingNode = nodeIt->second;
    }
    // Anything else means React has already handed this tag to a live view, as
    // it does when a view unflattens. That view is not ours to unmount, so drop
    // the record of the withheld one instead of completing it against the wrong
    // node.
    if (!exitingNode) {
      layoutAnimations_.erase(layoutAnimationIt);
      return surfaceId_;
    }
  }

  completedAnimations_.insert_or_assign(
      tag, CompletedLayoutAnimation{.animation = layoutAnimationIt->second, .shouldRemove = shouldRemove});
  layoutAnimations_.erase(layoutAnimationIt);

  if (exitingNode) {
    exitingNode->setExitingState(DEAD);
  }

  return surfaceId_;
}

// A subtree that animates keeps its place in the host tree, so nothing is emitted for its root.
// A subtree that does not animate emits its Remove in stream order. Its teardown mounts at the
// end of the transaction, so native code that reads a view on unmount still sees its children.
void LayoutAnimationsProxy::handleSubtreeRemoval(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<LightNode> &parent,
    const int hostIndex,
    TransactionMeta &transaction) const {
  ReanimatedSystraceSection s("handleSubtreeRemoval");
  const StartAnimationsRecursivelyConfig config = {
      .shouldRemoveSubviewsWithoutAnimations = true,
      .shouldAnimate = !transaction.surfaceDropped,
      .isScreenPop = false,
  };
  if (startAnimationsRecursively(node, transaction, config)) {
    return;
  }
  react_native_assert(!node->isExiting() && "A subtree that does not animate must stay UNDEFINED");
  cancelLayoutAnimation(node->current.tag);
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    hiddenViewTags_.erase(node->current.tag);
  }
  transaction.filteredMutations.push_back(
      ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, hostIndex));
  transaction.teardownMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
  parent->children.erase(parent->children.begin() + hostIndex);
}

void LayoutAnimationsProxy::flushCompletedRemovals(ShadowViewMutationList &filteredMutations) const {
  ReanimatedSystraceSection s("flushCompletedRemovals");

  std::vector<Tag> completedRemovalTags;
  completedRemovalTags.reserve(completedAnimations_.size());
  for (const auto &[tag, completedAnimation] : completedAnimations_) {
    if (hasPendingLayoutAnimation(tag) || !completedAnimation.shouldRemove) {
      continue;
    }
    completedRemovalTags.push_back(tag);
  }

  for (const auto tag : completedRemovalTags) {
    const auto completedAnimationIt = completedAnimations_.find(tag);
    if (completedAnimationIt == completedAnimations_.end() || hasPendingLayoutAnimation(tag) ||
        !completedAnimationIt->second.shouldRemove) {
      continue;
    }
    const auto nodeIt = lightNodes_.find(tag);
    if (nodeIt == lightNodes_.end() || nodeIt->second->state != DEAD) {
      continue;
    }
    const auto node = nodeIt->second;
    auto parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");
    auto index = parent->removeChild(node);
    react_native_assert(index != -1 && "Dead node not found");

    endAnimationsRecursively(node, index, filteredMutations);
    maybeDropAncestors(parent, filteredMutations);
  }
}

void LayoutAnimationsProxy::addOngoingAnimations(ShadowViewMutationList &mutations) const {
  ReanimatedSystraceSection s1("addOngoingAnimations");
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
#endif

    auto layoutAnimationIt = layoutAnimations_.find(tag);
    auto completedAnimationIt = completedAnimations_.find(tag);
    if (layoutAnimationIt == layoutAnimations_.end() &&
        (completedAnimationIt == completedAnimations_.end() || completedAnimationIt->second.shouldRemove)) {
      continue;
    }

    auto &layoutAnimation = layoutAnimationIt != layoutAnimations_.end() ? layoutAnimationIt->second
                                                                         : completedAnimationIt->second.animation;
    auto newView = layoutAnimation.finalView;
    if (updateValues.newProps) {
      newView.props = updateValues.newProps;
    }
    updateLayoutMetrics(newView.layoutMetrics, updateValues.frame, layoutAnimation.frameOffset);

    mutations.push_back(
        ShadowViewMutation::UpdateMutation(layoutAnimation.currentView, newView, layoutAnimation.parentTag));
    layoutAnimation.currentView = newView;
    if (layoutAnimation.opacity && static_cast<const ViewProps &>(*newView.props).opacity == *layoutAnimation.opacity) {
      layoutAnimation.opacity.reset();
    }
  }
  updateMap_.clear();
}

void LayoutAnimationsProxy::endAnimationsRecursively(
    const std::shared_ptr<LightNode> &node,
    int index,
    ShadowViewMutationList &mutations) const {
  const auto tag = node->current.tag;
  cancelLayoutAnimation(tag);
  node->setExitingState(DELETED);
  unmapLightNode(node);
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list

  const int childrenSize = static_cast<int>(node->children.size());
  for (int i = childrenSize - 1; i >= 0; i--) {
    auto &subNode = node->children[i];
    if (subNode->state != DELETED) {
      endAnimationsRecursively(subNode, i, mutations);
    }
  }
  node->clearChildren();

  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    hiddenViewTags_.erase(node->current.tag);
  }
  mutations.push_back(ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, index));
  mutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
}

void LayoutAnimationsProxy::maybeDropAncestors(
    const std::shared_ptr<LightNode> &node,
    ShadowViewMutationList &cleanupMutations) const {
  if (node->children.size() != 0 || node->state == ANIMATING || node->state == UNDEFINED) {
    return;
  }

  auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  auto index = parent->removeChild(node);
  react_native_assert(index != -1 && "Child node not found");

  node->setExitingState(DELETED);
  unmapLightNode(node);
  cancelLayoutAnimation(node->current.tag);
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    hiddenViewTags_.erase(node->current.tag);
  }
  cleanupMutations.push_back(ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, index));
  cleanupMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
  maybeDropAncestors(parent, cleanupMutations);
}

bool LayoutAnimationsProxy::startAnimationsRecursively(
    const std::shared_ptr<LightNode> &node,
    TransactionMeta &transaction,
    StartAnimationsRecursivelyConfig config) const {
  auto &mutations = transaction.teardownMutations;
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
  std::vector<std::shared_ptr<LightNode>> toBeRemoved;

  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  auto index = static_cast<int>(node->children.size());
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++) {
    index--;
    auto &subNode = *it;
    if (subNode->state != UNDEFINED) {
      if (shouldAnimate && subNode->state != DEAD) {
        hasAnimatedChildren = true;
      } else {
        endAnimationsRecursively(subNode, index, mutations);
        toBeRemoved.push_back(subNode);
      }
    } else if (startAnimationsRecursively(subNode, transaction, config)) {
      hasAnimatedChildren = true;
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      cancelLayoutAnimation(subNode->current.tag);
      if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
        hiddenViewTags_.erase(subNode->current.tag);
      }
      mutations.push_back(ShadowViewMutation::RemoveMutation(node->current.tag, subNode->current, index));
      toBeRemoved.push_back(subNode);
      subNode->setExitingState(DELETED);
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->current));
    } else {
      subNode->setExitingState(WAITING);
      // register withheld subtree members, so that reconcileContradictedRemovals
      // can find them when React re-creates their tags
      lightNodes_[subNode->current.tag] = subNode;
    }
  }

  for (auto &subNode : toBeRemoved) {
    node->removeChild(subNode);
  }

  const bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->setExitingState(ANIMATING);
    lightNodes_[node->current.tag] = node;
    transaction.exiting.push_back({node, exitConfig});
  } else {
    if (!shouldAnimate) {
      layoutAnimationsManager_->clearLayoutAnimationConfig(node->current.tag);
    }
    if (hasAnimatedChildren) {
      node->setExitingState(WAITING);
      lightNodes_[node->current.tag] = node;
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
    sharedContainers_.clear();
    transition_.reset();
    uncommittedScreenPop_.reset();
  }
#ifdef ANDROID
  cleanupPullScheduled_ = false;
#endif
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
ShadowView LayoutAnimationsProxy::cloneViewWithoutOpacity(
    const ShadowView &shadowView,
    const PropsParserContext &propsParserContext) const {
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
// add structural cleanup mutations there. This gate can go away with Android's
// pull model.
bool LayoutAnimationsProxy::shouldFlushStructuralMutations() const {
#ifdef ANDROID
  return !worklets::isOnUIThread(uiScheduler_);
#else
  return true;
#endif
}

void LayoutAnimationsProxy::cleanupAnimations(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations) const {
  ReanimatedSystraceSection s("cleanupAnimations");
  std::unordered_set<Tag> preservedContainerTags;
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    for (const auto &[tag, _] : completedAnimations_) {
      if (hasPendingLayoutAnimation(tag)) {
        continue;
      }
      const auto containerIt = sharedContainers_.find(tag);
      if (containerIt == sharedContainers_.end()) {
        continue;
      }
      if (!flushStructuralMutations) {
        preservedContainerTags.insert(tag);
        continue;
      }
      if (containerIt->second.restoreAfterNode) {
        transaction.nodesToRestore.push_back(containerIt->second.restoreAfterNode);
      }
      removeSharedContainer(tag, transaction);
    }

    cleanupSharedTransitions(transaction, propsParserContext);
  }
  cleanupCompletedAnimations(transaction.filteredMutations, propsParserContext, true, preservedContainerTags);
}

#ifdef ANDROID
bool LayoutAnimationsProxy::hasPendingStructuralCleanup() const {
  return std::ranges::any_of(completedAnimations_, [this](const auto &entry) {
    const auto &[tag, completedAnimation] = entry;
    return !hasPendingLayoutAnimation(tag) && (completedAnimation.shouldRemove || sharedContainers_.contains(tag));
  });
}

void LayoutAnimationsProxy::maybeScheduleCleanupPull(const bool flushedStructuralMutations) const {
  if (flushedStructuralMutations) {
    cleanupPullScheduled_ = false;
  } else if (hasPendingStructuralCleanup() && !cleanupPullScheduled_) {
    cleanupPullScheduled_ = true;
    scheduleCleanupPull();
  }
}
#endif

// MARK: Start Animation

void LayoutAnimationsProxy::startEnteringAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config) const {
  resolveLightNodeProps(node);
  const auto &newChildShadowView = node->current;
  const auto &props = newChildShadowView.props;
  auto &viewProps = static_cast<const ViewProps &>(*props);
  const auto opacity = viewProps.opacity;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = newChildShadowView.tag,
      .type = LayoutAnimationType::ENTERING,
      .before = newChildShadowView,
      .after = newChildShadowView,
      .parentTag = parent->current.tag,
      .opacity = opacity,
      .config = config,
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
    const int tag,
    const ShadowView &before,
    const ShadowView &after,
    const std::shared_ptr<Serializable> &config) const {
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = tag,
      .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION,
      .before = before,
      .after = after,
      .parentTag = surfaceId_,
      .config = config,
  });
}

void LayoutAnimationsProxy::startProgressTransition(const int tag, const ShadowView &before, const ShadowView &after)
    const {
  enqueueLayoutAnimation(ProgressLayoutAnimationStart{
      .tag = tag,
      .before = before,
      .after = after,
      .parentTag = surfaceId_,
  });
}

} // namespace reanimated
