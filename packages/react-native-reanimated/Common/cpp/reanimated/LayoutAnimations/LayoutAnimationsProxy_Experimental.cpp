#include <react/debug/react_native_assert.h>
#include <react/renderer/mounting/Differentiator.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <worklets/Compat/StableApi.h>

#include <algorithm>
#include <memory>
#include <ranges>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {
using enum LayoutAnimationType;
using enum ExitingState;

std::shared_ptr<LayoutAnimationsProxyRegistry> createLayoutAnimationsProxyExperimentalRegistry(
    const LayoutAnimationsProxyDependencies &dependencies) {
  return std::make_shared<LayoutAnimationsProxyRegistry>(
      [dependencies](const SurfaceId surfaceId) -> std::shared_ptr<LayoutAnimationsProxyCommon> {
        return std::make_shared<LayoutAnimationsProxy_Experimental>(surfaceId, dependencies);
      });
}

LayoutAnimationsProxy_Experimental::LayoutAnimationsProxy_Experimental(
    const SurfaceId surfaceId,
    const LayoutAnimationsProxyDependencies &dependencies)
    : LayoutAnimationsProxyCommon(surfaceId, dependencies),
      sharedTransitionManager_(dependencies.layoutAnimationsManager->getSharedTransitionManager()) {
#ifdef __APPLE__
  forceScreenSnapshot_ = dependencies.forceScreenSnapshot;
#endif
}

// MARK: MountingOverrideDelegate

std::optional<MountingTransaction> LayoutAnimationsProxy_Experimental::pullTransaction(
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
  auto &filteredMutations = transaction.filteredMutations;
  auto rootChildCount = static_cast<int>(lightNodes_[surfaceId_]->children.size());
  const bool flushStructuralMutations = shouldFlushStructuralMutations();

  reconcileContradictedRemovals(mutations, filteredMutations);

  if (transition_ || uncommittedScreenPop_) {
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

  flushCompletedRemovals(filteredMutations, flushStructuralMutations);

  configLock.unlock();
  flushLayoutAnimationOperations(lock);

  addOngoingAnimations(filteredMutations);

  cleanupAnimations(transaction, propsParserContext, flushStructuralMutations);

#ifdef ANDROID
  maybeScheduleCleanupPull(flushStructuralMutations);
#endif

  insertContainers(transaction, rootChildCount);

  return MountingTransaction{surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

bool LayoutAnimationsProxy_Experimental::isLightNodeMapped(const std::shared_ptr<LightNode> &node) const {
  if (!node) {
    return false;
  }
  const auto nodeIt = lightNodes_.find(node->current.tag);
  return nodeIt != lightNodes_.end() && nodeIt->second == node;
}

// the only erase of lightNodes_ once the tree is initialized
void LayoutAnimationsProxy_Experimental::unmapLightNode(const std::shared_ptr<LightNode> &node) const {
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
// lightNodes_ entry (the "LightNode already exists" assert is compiled out in
// release), orphaning the still-mounted exiting view, and the eventual
// removal flush would then remove the wrong, live view and crash the
// mounting layer.
//
// This must run before updateLightTree (so the tag is re-registered cleanly)
// and before addOngoingAnimations (which would otherwise emit an Update for a
// tag we are about to Delete this frame).
void LayoutAnimationsProxy_Experimental::reconcileContradictedRemovals(
    const ShadowViewMutationList &mutations,
    ShadowViewMutationList &filteredMutations) const {
  for (const auto &mutation : mutations) {
    if (mutation.type != ShadowViewMutation::Type::Create && mutation.type != ShadowViewMutation::Type::Insert) {
      continue;
    }
    const auto tag = mutation.newChildShadowView.tag;
    const auto it = lightNodes_.find(tag);
    if (it == lightNodes_.end() || it->second->state == UNDEFINED) {
      continue;
    }
    const auto node = it->second;
    completedAnimations_.erase(tag);
    updateMap_.erase(tag);
    unmapLightNode(node);
    if (node->state == DELETED) {
      // already unmounted — only the stale map entry had to go
      continue;
    }
    const auto parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");
    if (!parent) {
      continue;
    }
    const auto index = parent->removeChild(node);
    react_native_assert(index != -1 && "Exiting node not found");
    if (index == -1) {
      continue;
    }
    endAnimationsRecursively(node, index, filteredMutations);
    maybeDropAncestors(parent, filteredMutations);
  }
}

bool LayoutAnimationsProxy_Experimental::shouldOverridePullTransaction() const {
  // we need to listen to every possible mutation to keep the light tree updated
  return true;
}

// MARK: Light Tree

void LayoutAnimationsProxy_Experimental::updateLightTree(
    const PropsParserContext &propsParserContext,
    const ShadowViewMutationList &mutations,
    TransactionMeta &transaction) const {
  ReanimatedSystraceSection s("updateLightTree");
  auto &filteredMutations = transaction.filteredMutations;
  std::unordered_set<Tag> inserted, moved, deleted;
  std::unordered_map<Tag, IndexCursors> indexCursors;
  std::unordered_map<Tag, ShadowView> updatedViews;
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
        node->previous = mutation.oldChildShadowView;
#ifdef ANDROID
        // TODO (future): We don't merge the root view as the currently stored version might not be accurate, because of
        // the inconsequential initialization order of proxy and the surface
        if (!isRoot(node) && node->current.props) {
          // On android rawProps are used to store the diffed props so we need to merge them
          // This should soon be replaced in RN with Props 2.0 (the diffing will be done at the end of the pipeline)
          auto &currentRawProps = node->current.props->rawProps;
          auto mergedRawProps = folly::dynamic::merge(currentRawProps, mutation.newChildShadowView.props->rawProps);
          node->current = mutation.newChildShadowView;
          node->current.props =
              componentDescriptorRegistry_->at(node->current.componentHandle)
                  .cloneProps(propsParserContext, mutation.newChildShadowView.props, RawProps(mergedRawProps));
        } else {
          node->current = mutation.newChildShadowView;
        }
#else
        node->current = mutation.newChildShadowView;
#endif // ANDROID
        auto tag = mutation.newChildShadowView.tag;
        auto config = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LAYOUT);
        if (!config) {
          config = getRetargetLayoutAnimationConfig(tag);
        }
        if (config) {
          transaction.layout.push_back({node, config});
        } else if (!updateEnteringAnimationTarget(tag, mutation.newChildShadowView)) {
          filteredMutations.push_back(mutation);
        }
        break;
      }
      case ShadowViewMutation::Create: {
        const auto &node = std::make_shared<LightNode>();
        node->current = mutation.newChildShadowView;
        react_native_assert(!lightNodes_.contains(mutation.newChildShadowView.tag) && "LightNode already exists");

        lightNodes_[mutation.newChildShadowView.tag] = node;
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
          unmapLightNode(it->second);
        }
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
        bool hasSharedTransition;
        {
          auto sharedTransitionLock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
          hasSharedTransition = sharedTransitionManager_->tagToName_.contains(tag);
        }
        const auto layoutConfig = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LAYOUT);
        const auto enteringConfig = layoutAnimationsManager_->getLayoutAnimationConfig(tag, ENTERING);
        if (moved.contains(tag)) {
          if (const auto currentView = reparentLayoutAnimation(tag, mutation.parentTag)) {
            filteredMutations.push_back(
                ShadowViewMutation::InsertMutation(mutation.parentTag, *currentView, hostIndex));
          } else if (const auto updatedViewIt = updatedViews.find(tag);
                     updatedViewIt != updatedViews.end() && layoutConfig) {
            filteredMutations.push_back(
                ShadowViewMutation::InsertMutation(mutation.parentTag, updatedViewIt->second, hostIndex));
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
}

void LayoutAnimationsProxy_Experimental::applyInitialMutationsToLightTree(
    const ShadowViewMutationList &mutations) const {
  for (const auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation);
    switch (mutation.type) {
      case ShadowViewMutation::Update: {
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        react_native_assert(node && "LightNode not found");
        node->previous = mutation.oldChildShadowView;
        node->current = mutation.newChildShadowView;
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

void LayoutAnimationsProxy_Experimental::startSurface(
    const ShadowTree &shadowTree,
    std::weak_ptr<const MountingOverrideDelegate> mountingOverrideDelegate) {
  react_native_assert(shadowTree.getSurfaceId() == surfaceId_ && "surface registered with the wrong proxy");
  const auto mountingCoordinator = shadowTree.getMountingCoordinator();
  mountingCoordinator->setMountingOverrideDelegate(std::move(mountingOverrideDelegate));
  // The delegate must be set before the base revision is read, so that every
  // transaction is either contained in the revision or buffered by the proxy.
  initializeLightTree(mountingCoordinator->getBaseRevision());
}

void LayoutAnimationsProxy_Experimental::initializeLightTree(const ShadowTreeRevision &baseRevision) {
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
  topScreen_ = findActiveBoundary(lightNodes_.at(surfaceId_));
}

// MARK: Layout Animation Updates

std::optional<SurfaceId> LayoutAnimationsProxy_Experimental::endLayoutAnimation(int tag, bool shouldRemove) {
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
  nodeIt->second->setExitingState(DEAD);

  return surfaceId_;
}

// A subtree that animates keeps its place in the host tree, so nothing is emitted for its root.
// A subtree that does not animate emits its Remove in stream order. Its teardown mounts at the
// end of the transaction, so native code that reads a view on unmount still sees its children.
void LayoutAnimationsProxy_Experimental::handleSubtreeRemoval(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<LightNode> &parent,
    const int hostIndex,
    TransactionMeta &transaction) const {
  ReanimatedSystraceSection s("handleSubtreeRemoval");
  const StartAnimationsRecursivelyConfig config = {
      .shouldRemoveSubviewsWithoutAnimations = true,
      .shouldAnimate = true,
      .isScreenPop = false,
  };
  if (startAnimationsRecursively(node, transaction, config)) {
    return;
  }
  react_native_assert(!node->isExiting() && "A subtree that does not animate must stay UNDEFINED");
  cancelLayoutAnimation(node->current.tag);
  transaction.filteredMutations.push_back(
      ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, hostIndex));
  transaction.teardownMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
  parent->children.erase(parent->children.begin() + hostIndex);
}

void LayoutAnimationsProxy_Experimental::flushCompletedRemovals(
    ShadowViewMutationList &filteredMutations,
    const bool flushStructuralMutations) const {
  ReanimatedSystraceSection s("flushCompletedRemovals");

  if (!flushStructuralMutations) {
    return;
  }

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

void LayoutAnimationsProxy_Experimental::addOngoingAnimations(ShadowViewMutationList &mutations) const {
  ReanimatedSystraceSection s1("addOngoingAnimations");
#ifdef ANDROID
  std::vector<int> tagsToUpdate;
  tagsToUpdate.reserve(updateMap_.size());
  for (const auto &[tag, _] : updateMap_) {
    tagsToUpdate.push_back(tag);
  }

  auto maybeCorrectedTags = preserveMountedTags_(tagsToUpdate);
  if (!maybeCorrectedTags.has_value()) {
    return;
  }

  auto correctedTags = maybeCorrectedTags->get();

  // since the map is not updated, we can assume that the ordering of tags in
  // correctedTags matches the iterator
  int i = -1;
#endif
  for (auto &[tag, updateValues] : updateMap_) {
#ifdef ANDROID
    i++;
    if (correctedTags[i] == -1) {
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
    updateLayoutMetrics(newView.layoutMetrics, updateValues.frame);

    mutations.push_back(
        ShadowViewMutation::UpdateMutation(layoutAnimation.currentView, newView, layoutAnimation.parentTag));
    layoutAnimation.currentView = newView;
    if (layoutAnimation.opacity && static_cast<const ViewProps &>(*newView.props).opacity == *layoutAnimation.opacity) {
      layoutAnimation.opacity.reset();
    }
  }
  updateMap_.clear();
}

void LayoutAnimationsProxy_Experimental::endAnimationsRecursively(
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
  mutations.push_back(ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, index));
  mutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
}

void LayoutAnimationsProxy_Experimental::maybeDropAncestors(
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
  cleanupMutations.push_back(ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, index));
  cleanupMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
  maybeDropAncestors(parent, cleanupMutations);
}

bool LayoutAnimationsProxy_Experimental::startAnimationsRecursively(
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

void LayoutAnimationsProxy_Experimental::clearSurfaceState() const {
  LayoutAnimationsProxyCommon::clearSurfaceState();
  sharedContainers_.clear();
  transition_.reset();
  uncommittedScreenPop_.reset();
#ifdef ANDROID
  cleanupPullScheduled_ = false;
#endif
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
ShadowView LayoutAnimationsProxy_Experimental::cloneViewWithoutOpacity(
    const ShadowView &shadowView,
    const PropsParserContext &propsParserContext) const {
  auto newView = shadowView;
  const folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps = componentDescriptorRegistry_->at(newView.componentHandle)
                      .cloneProps(propsParserContext, newView.props, RawProps(opacity));
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
  viewProps->opacity = 0;
  newView.props = newProps;
  return newView;
}

// Android's push model applies JS-thread transactions asynchronously on the UI
// thread. A UI-thread pull can overtake them, so completed animations must not
// add structural cleanup mutations there. This gate can go away with Android's
// pull model.
bool LayoutAnimationsProxy_Experimental::shouldFlushStructuralMutations() const {
#ifdef ANDROID
  return !worklets::isOnUIThread(uiScheduler_);
#else
  return true;
#endif
}

void LayoutAnimationsProxy_Experimental::cleanupAnimations(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations) const {
  ReanimatedSystraceSection s("cleanupAnimations");
  std::unordered_set<Tag> preservedContainerTags;
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
  cleanupCompletedAnimations(transaction.filteredMutations, propsParserContext, true, preservedContainerTags);
}

#ifdef ANDROID
bool LayoutAnimationsProxy_Experimental::hasPendingStructuralCleanup() const {
  return std::ranges::any_of(completedAnimations_, [this](const auto &entry) {
    const auto &[tag, completedAnimation] = entry;
    return !hasPendingLayoutAnimation(tag) && (completedAnimation.shouldRemove || sharedContainers_.contains(tag));
  });
}

void LayoutAnimationsProxy_Experimental::maybeScheduleCleanupPull(const bool flushedStructuralMutations) const {
  if (flushedStructuralMutations) {
    cleanupPullScheduled_ = false;
  } else if (hasPendingStructuralCleanup() && !cleanupPullScheduled_) {
    cleanupPullScheduled_ = true;
    scheduleCleanupPull();
  }
}
#endif

// MARK: Start Animation

void LayoutAnimationsProxy_Experimental::startEnteringAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config) const {
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

void LayoutAnimationsProxy_Experimental::startExitingAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config) const {
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

void LayoutAnimationsProxy_Experimental::startLayoutAnimation(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<Serializable> &config) const {
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

void LayoutAnimationsProxy_Experimental::startSharedTransition(
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

void LayoutAnimationsProxy_Experimental::startProgressTransition(
    const int tag,
    const ShadowView &before,
    const ShadowView &after) const {
  enqueueLayoutAnimation(ProgressLayoutAnimationStart{
      .tag = tag,
      .before = before,
      .after = after,
      .parentTag = surfaceId_,
  });
}

} // namespace reanimated
