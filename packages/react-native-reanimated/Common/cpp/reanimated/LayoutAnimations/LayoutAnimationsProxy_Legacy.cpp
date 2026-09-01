#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.h>
#include <worklets/Compat/StableApi.h>

#include <react/debug/react_native_assert.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowViewMutation.h>

#include <memory>
#include <ranges>
#include <set>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

// We never modify the Shadow Tree, we just send some additional
// mutations to the mounting layer.
// When animations finish, the Host Tree will represent the most recent Shadow
// Tree
// On android this code will be sometimes executed on the JS thread.
// That's why we have to schedule some of animation manager function on the UI
// thread
std::optional<MountingTransaction> LayoutAnimationsProxy_Legacy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << std::endl;
  LOG(INFO) << "pullTransaction " << std::this_thread::get_id() << " " << surfaceId << std::endl;
#endif
  react_native_assert(surfaceId == surfaceId_ && "pull routed to the wrong surface's proxy");
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  ShadowViewMutationList filteredMutations;

  std::vector<std::shared_ptr<MutationNode>> roots;
  std::unordered_map<Tag, Tag> movedViews;

  reconcileContradictedRemovals(mutations, filteredMutations);

  addOngoingAnimations(filteredMutations);

  parseRemoveMutations(movedViews, mutations, roots);

  // We recognize dropped surfaces by the presence of a Remove mutation for a root child. This can produce false
  // positives. Ideal solution will be to introduce an appropriate API in RN
  auto surfaceDropped = false;
  const auto removesRootChildren = std::ranges::any_of(mutations, [surfaceId](const auto &mutation) {
    return mutation.type == ShadowViewMutation::Remove && mutation.parentTag == surfaceId;
  });
  if (removesRootChildren) {
    surfaceDropped = surfaceToRemove_;
    surfaceToRemove_ = false;
  }
  const bool flushDeadNodes = shouldFlushDeadNodes(surfaceDropped);
  handleRemovals(filteredMutations, roots, surfaceDropped, flushDeadNodes);
#ifdef ANDROID
  maybeScheduleCleanupPull(flushDeadNodes);
#endif // ANDROID

  handleUpdatesAndEnterings(filteredMutations, movedViews, mutations, propsParserContext);

  flushLayoutAnimationOperations(lock);

  addOngoingAnimations(filteredMutations);
  cleanupCompletedAnimations(filteredMutations, propsParserContext);

  dropUpdatesForDeletedViews(filteredMutations);

  return MountingTransaction{surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

// The LayoutAnimationDriver can pair a final keyframe update with the withheld
// Remove/Delete it replays in the same transaction; we emit removals first, so
// the update would reach the mounting layer after its view was deleted.
void LayoutAnimationsProxy_Legacy::dropUpdatesForDeletedViews(ShadowViewMutationList &filteredMutations) const {
  std::unordered_set<Tag> deletedTags;
  for (const auto &mutation : filteredMutations) {
    if (mutation.type == ShadowViewMutation::Delete) {
      deletedTags.insert(mutation.oldChildShadowView.tag);
    }
  }
  if (!deletedTags.empty()) {
    std::erase_if(filteredMutations, [&deletedTags](const auto &mutation) {
      return mutation.type == ShadowViewMutation::Update && deletedTags.contains(mutation.newChildShadowView.tag);
    });
  }
}

// If React re-creates or re-inserts a tag whose exiting removal we are still
// withholding, it has contradicted that withheld Remove/Delete. Flush it now
// instead of letting it fire later against a stale hierarchy (which would
// unmount the wrong, still-live view and crash the mounting layer).
//
// This must run before addOngoingAnimations (which would otherwise emit an
// Update for a tag we are about to Delete this frame) and before
// parseRemoveMutations, so the rest of the pipeline sees clean bookkeeping.
void LayoutAnimationsProxy_Legacy::reconcileContradictedRemovals(
    ShadowViewMutationList &mutations,
    ShadowViewMutationList &filteredMutations) const {
  for (auto &mutation : mutations) {
    if (mutation.type != ShadowViewMutation::Type::Create && mutation.type != ShadowViewMutation::Type::Insert) {
      continue;
    }
    auto tag = mutation.newChildShadowView.tag;
    auto it = nodeForTag_.find(tag);
    // Only a MutationNode represents a withheld removal; a plain Node is just a
    // live parent of some removed child and must be left untouched.
    if (it == nodeForTag_.end() || !it->second->isMutationNode()) {
      continue;
    }
    auto node = std::static_pointer_cast<MutationNode>(it->second);
    completedAnimations_.erase(tag);
    updateMap_.erase(tag);
    // Flush the withheld Remove/Delete for this tag (and its withheld subtree)
    // right now, mirroring the deadNodes cleanup in handleRemovals. This removes
    // the stale view before React's Create/Insert re-registers the same tag.
    endAnimationsRecursively(node, filteredMutations);
    maybeDropAncestors(node->unflattenedParent, node, filteredMutations);
    deadNodes_.erase(node);
  }
}

// On android mutations that alter the view hierarchy are only produced on the JS thread (the push model), so to not
// race with those, we apply the dead nodes cleanup only on the JS thread, unless there is a surface drop, in which case
// we can safely cleanup on the UI thread since the surface is gone and no more mutations will be produced for it.
bool LayoutAnimationsProxy_Legacy::shouldFlushDeadNodes([[maybe_unused]] const bool surfaceDropped) const {
#ifdef ANDROID
  return surfaceDropped || !worklets::isOnUIThread(uiScheduler_);
#else
  return true;
#endif
}

#ifdef ANDROID
// We schedule a pullTransaction call to happen on the JS thread so it can safely remove dead nodes after exiting
// finished
void LayoutAnimationsProxy_Legacy::maybeScheduleCleanupPull(const bool flushedDeadNodes) const {
  if (flushedDeadNodes) {
    cleanupPullScheduled_ = false;
  } else if (!deadNodes_.empty() && !cleanupPullScheduled_) {
    cleanupPullScheduled_ = true;
    scheduleCleanupPull();
  }
}
#endif

std::optional<SurfaceId> LayoutAnimationsProxy_Legacy::endLayoutAnimation(int tag, bool shouldRemove) {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "end layout animation for " << tag << " - should remove " << shouldRemove << std::endl;
#endif
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  completedAnimations_.insert_or_assign(
      tag, CompletedLayoutAnimation{.animation = layoutAnimationIt->second, .shouldRemove = shouldRemove});
  layoutAnimations_.erase(layoutAnimationIt);

  if (!shouldRemove || !nodeForTag_.contains(tag)) {
    return surfaceId_;
  }

  auto node = nodeForTag_[tag];
  if (!node->isMutationNode()) {
    react_native_assert(false && "exiting tag must map to a MutationNode");
    return {};
  }
  auto mutationNode = std::static_pointer_cast<MutationNode>(node);
  mutationNode->state = ExitingState_Legacy::DEAD;
  deadNodes_.insert(mutationNode);

  return surfaceId_;
}

/**
 Organizes removed views into a tree structure, allowing for convenient
 traversals and index maintenance
 */
void LayoutAnimationsProxy_Legacy::parseRemoveMutations(
    std::unordered_map<Tag, Tag> &movedViews,
    ShadowViewMutationList &mutations,
    std::vector<std::shared_ptr<MutationNode>> &roots) const {
  std::set<Tag> deletedViews;
  std::unordered_map<Tag, std::vector<std::shared_ptr<MutationNode>>> childrenForTag, unflattenedChildrenForTag;

  std::vector<std::shared_ptr<MutationNode>> mutationNodes;

  // iterate from the end, so that parents appear before children
  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    auto &mutation = *it;
    if (mutation.type == ShadowViewMutation::Delete) {
      deletedViews.insert(mutation.oldChildShadowView.tag);
    }
    if (mutation.type == ShadowViewMutation::Remove) {
      updateIndexForMutation(mutation);
      auto tag = mutation.oldChildShadowView.tag;
      auto parentTag = mutation.parentTag;

      std::shared_ptr<MutationNode> mutationNode;
      std::shared_ptr<Node> node = nodeForTag_[tag], parent = nodeForTag_[parentTag];

      if (!node) {
        mutationNode = std::make_shared<MutationNode>(mutation);
      } else {
        mutationNode = std::make_shared<MutationNode>(mutation, std::move(*node));
        for (auto &subNode : mutationNode->children) {
          subNode->parent = mutationNode;
        }
        for (auto &subNode : mutationNode->unflattenedChildren) {
          subNode->unflattenedParent = mutationNode;
        }
      }
      if (!deletedViews.contains(mutation.oldChildShadowView.tag)) {
        mutationNode->state = ExitingState_Legacy::MOVED;
        movedViews.insert_or_assign(mutation.oldChildShadowView.tag, -1);
      }
      nodeForTag_[tag] = mutationNode;

      if (!parent) {
        parent = std::make_shared<Node>(parentTag);
        nodeForTag_[parentTag] = parent;
      }

      mutationNodes.push_back(mutationNode);

      childrenForTag[parentTag].push_back(mutationNode);
      unflattenedChildrenForTag[parentTag].push_back(mutationNode);
      mutationNode->parent = parent;
      mutationNode->unflattenedParent = parent;
    }
    if (mutation.type == ShadowViewMutation::Update && movedViews.contains(mutation.newChildShadowView.tag)) {
      auto node = nodeForTag_[mutation.newChildShadowView.tag];
      auto mutationNode = std::static_pointer_cast<MutationNode>(node);
      mutationNode->mutation.oldChildShadowView = mutation.oldChildShadowView;
    }
  }

  for (const auto &mutation : mutations) {
    if (mutation.type == ShadowViewMutation::Insert && movedViews.contains(mutation.newChildShadowView.tag)) {
      movedViews[mutation.newChildShadowView.tag] = mutation.parentTag;
    }
  }

  for (auto &[parentTag, children] : childrenForTag) {
    auto &parent = nodeForTag_[parentTag];
    parent->insertChildren(children);
    for (auto &child : children) {
      child->parent = parent;
    }
  }
  for (auto &[unflattenedParentTag, children] : unflattenedChildrenForTag) {
    auto &unflattenedParent = nodeForTag_[unflattenedParentTag];
    unflattenedParent->insertUnflattenedChildren(children);
    for (auto &child : children) {
      child->unflattenedParent = unflattenedParent;
    }
  }

  for (auto &mutationNode : mutationNodes) {
    if (!mutationNode->unflattenedParent->isMutationNode()) {
      roots.push_back(mutationNode);
    }
  }
}

void LayoutAnimationsProxy_Legacy::handleRemovals(
    ShadowViewMutationList &filteredMutations,
    std::vector<std::shared_ptr<MutationNode>> &roots,
    bool surfaceDropped,
    bool flushDeadNodes) const {
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = roots.rbegin(); it != roots.rend(); it++) {
    auto &node = *it;
    if (!startAnimationsRecursively(node, true, !surfaceDropped, false, filteredMutations)) {
      filteredMutations.push_back(node->mutation);
      node->unflattenedParent->removeChildFromUnflattenedTree(node); //???
      if (node->state != ExitingState_Legacy::MOVED) {
        cancelLayoutAnimation(node->tag);
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
        nodeForTag_.erase(node->tag);
        node->state = ExitingState_Legacy::DELETED;
#ifdef LAYOUT_ANIMATIONS_LOGS
        LOG(INFO) << "delete " << node->tag << std::endl;
#endif
      }
    }
  }

  if (!flushDeadNodes) {
    // Deferred - the host still has these views mounted, bookkeeping stays.
    return;
  }
  for (const auto &node : deadNodes_) {
    if (node->state != ExitingState_Legacy::DELETED) {
      endAnimationsRecursively(node, filteredMutations);
      maybeDropAncestors(node->unflattenedParent, node, filteredMutations);
    }
  }
  deadNodes_.clear();
}

void LayoutAnimationsProxy_Legacy::handleUpdatesAndEnterings(
    ShadowViewMutationList &filteredMutations,
    const std::unordered_map<Tag, Tag> &movedViews,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  std::unordered_map<Tag, ShadowView> oldShadowViewsForReparentings;
  for (auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation);

    Tag tag = mutation.type == ShadowViewMutation::Type::Create || mutation.type == ShadowViewMutation::Type::Insert
        ? mutation.newChildShadowView.tag
        : mutation.oldChildShadowView.tag;

    switch (mutation.type) {
      case ShadowViewMutation::Type::Create: {
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Type::Insert: {
        updateIndexForMutation(mutation);

        const auto parentTag = mutation.parentTag;
        if (nodeForTag_.contains(parentTag)) {
          nodeForTag_[parentTag]->applyMutationToIndices(mutation);
        }

        if (movedViews.contains(tag)) {
          if (const auto currentView = reparentLayoutAnimation(tag, movedViews.at(tag))) {
            filteredMutations.push_back(ShadowViewMutation::InsertMutation(parentTag, *currentView, mutation.index));
          } else if (oldShadowViewsForReparentings.contains(tag)) {
            filteredMutations.push_back(
                ShadowViewMutation::InsertMutation(parentTag, oldShadowViewsForReparentings[tag], mutation.index));
          } else {
            filteredMutations.push_back(mutation);
          }
          continue;
        }

        transferConfigFromNativeID(mutation.newChildShadowView.props->nativeId, mutation.newChildShadowView.tag);
        const auto enteringConfig =
            layoutAnimationsManager_->getLayoutAnimationConfig(tag, LayoutAnimationType::ENTERING);
        if (!enteringConfig) {
          filteredMutations.push_back(mutation);
          continue;
        }

        startEnteringAnimation(tag, mutation, enteringConfig);
        filteredMutations.push_back(mutation);

        // temporarily set opacity to 0 to prevent flickering on android
        std::shared_ptr<ShadowView> newView = cloneViewWithoutOpacity(mutation, propsParserContext);

        filteredMutations.push_back(
            ShadowViewMutation::UpdateMutation(mutation.newChildShadowView, *newView, parentTag));
        break;
      }

      case ShadowViewMutation::Type::Update: {
        auto shouldAnimate = hasLayoutChanged(mutation);
        const auto layoutConfig = layoutAnimationsManager_->getLayoutAnimationConfig(tag, LayoutAnimationType::LAYOUT);
        if (!layoutConfig || (!shouldAnimate && !layoutAnimations_.contains(tag) && !hasPendingLayoutAnimation(tag))) {
          // We should cancel any ongoing animation here to ensure that the
          // proper final state is reached for this view However, due to how
          // RNSScreens handle adding headers (a second commit is triggered to
          // offset all the elements by the header height) this would lead to
          // all entering animations being cancelled when a screen with a header
          // is pushed onto a stack
          // TODO: find a better solution for this problem
          filteredMutations.push_back(mutation);
          continue;
        } else if (!shouldAnimate) {
          updateLayoutAnimationTarget(tag, mutation.newChildShadowView);
          continue;
        }

        // store the oldChildShadowView, so that we can use this ShadowView when
        // the view is inserted
        oldShadowViewsForReparentings[tag] = mutation.oldChildShadowView;
        if (movedViews.contains(tag)) {
          mutation.parentTag = movedViews.at(tag);
        }
        if (mutation.parentTag != -1) {
          startLayoutAnimation(tag, mutation, layoutConfig);
        }
        break;
      }

      case ShadowViewMutation::Type::Remove:
      case ShadowViewMutation::Type::Delete: {
        break;
      }

      default:
        filteredMutations.push_back(mutation);
    }
  }
}

void LayoutAnimationsProxy_Legacy::addOngoingAnimations(ShadowViewMutationList &mutations) const {
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
    newView.props = updateValues.newProps;
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

void LayoutAnimationsProxy_Legacy::endAnimationsRecursively(
    const std::shared_ptr<MutationNode> &node,
    ShadowViewMutationList &mutations) const {
  cancelLayoutAnimation(node->tag);
  node->state = ExitingState_Legacy::DELETED;
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = node->unflattenedChildren.rbegin(); it != node->unflattenedChildren.rend(); it++) {
    auto &subNode = *it;
    if (subNode->state != ExitingState_Legacy::DELETED) {
      endAnimationsRecursively(subNode, mutations);
    }
  }
  mutations.push_back(node->mutation);
  nodeForTag_.erase(node->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "delete " << node->tag << std::endl;
#endif
  mutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
}

void LayoutAnimationsProxy_Legacy::maybeDropAncestors(
    const std::shared_ptr<Node> &parent,
    const std::shared_ptr<MutationNode> &child,
    ShadowViewMutationList &cleanupMutations) const {
  parent->removeChildFromUnflattenedTree(child);
  if (!parent->isMutationNode()) {
    return;
  }

  auto node = std::static_pointer_cast<MutationNode>(parent);

  if (node->children.size() == 0 && node->state != ExitingState_Legacy::ANIMATING) {
    nodeForTag_.erase(node->tag);
    cleanupMutations.push_back(node->mutation);
    cancelLayoutAnimation(node->tag);
    node->state = ExitingState_Legacy::DELETED;
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "delete " << node->tag << std::endl;
#endif
    cleanupMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
    maybeDropAncestors(node->unflattenedParent, node, cleanupMutations);
  }
}

bool LayoutAnimationsProxy_Legacy::startAnimationsRecursively(
    const std::shared_ptr<MutationNode> &node,
    bool shouldRemoveSubviewsWithoutAnimations,
    bool shouldAnimate,
    bool isScreenPop,
    ShadowViewMutationList &mutations) const {
  if (isRNSScreen(node)) {
    isScreenPop = true;
  }

  shouldAnimate = !isScreenPop && layoutAnimationsManager_->shouldAnimateExiting(node->tag, shouldAnimate);

  const auto exitConfig = shouldAnimate && node->state != ExitingState_Legacy::MOVED
      ? layoutAnimationsManager_->takeExitingAnimationConfigAndClearTag(node->tag)
      : nullptr;
  const bool hasExitAnimation = exitConfig != nullptr;
  bool hasAnimatedChildren = false;

  shouldRemoveSubviewsWithoutAnimations =
      shouldRemoveSubviewsWithoutAnimations && (!hasExitAnimation || node->state == ExitingState_Legacy::MOVED);
  std::vector<std::shared_ptr<MutationNode>> toBeRemoved;

  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = node->unflattenedChildren.rbegin(); it != node->unflattenedChildren.rend(); it++) {
    auto &subNode = *it;
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "child " << subNode->tag << " "
              << " " << shouldAnimate << " " << shouldRemoveSubviewsWithoutAnimations << std::endl;
#endif
    if (subNode->state != ExitingState_Legacy::UNDEFINED && subNode->state != ExitingState_Legacy::MOVED) {
      if (shouldAnimate && subNode->state != ExitingState_Legacy::DEAD) {
        hasAnimatedChildren = true;
      } else {
        endAnimationsRecursively(subNode, mutations);
        toBeRemoved.push_back(subNode);
      }
    } else if (startAnimationsRecursively(
                   subNode, shouldRemoveSubviewsWithoutAnimations, shouldAnimate, isScreenPop, mutations)) {
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "child " << subNode->tag << " start animations returned true " << std::endl;
#endif
      hasAnimatedChildren = true;
    } else if (subNode->state == ExitingState_Legacy::MOVED) {
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      cancelLayoutAnimation(subNode->tag);
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
      subNode->state = ExitingState_Legacy::DELETED;
      nodeForTag_.erase(subNode->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "delete " << subNode->tag << std::endl;
#endif
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->mutation.oldChildShadowView));
    } else {
      subNode->state = ExitingState_Legacy::WAITING;
    }
  }

  for (auto &subNode : toBeRemoved) {
    node->removeChildFromUnflattenedTree(subNode);
  }

  if (node->state == ExitingState_Legacy::MOVED) {
    auto replacement = std::make_shared<Node>(*node);
    for (const auto &subNode : node->children) {
      subNode->parent = replacement;
    }
    for (const auto &subNode : node->unflattenedChildren) {
      subNode->unflattenedParent = replacement;
    }
    nodeForTag_[replacement->tag] = replacement;
    return false;
  }

  bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->state = ExitingState_Legacy::ANIMATING;
    startExitingAnimation(node->tag, node->mutation, exitConfig);
  } else if (!shouldAnimate) {
    layoutAnimationsManager_->clearLayoutAnimationConfig(node->tag);
  }

  return wantAnimateExit;
}

void LayoutAnimationsProxy_Legacy::updateIndexForMutation(ShadowViewMutation &mutation) const {
  if (mutation.index == -1) {
    return;
  }

  const auto parentTag = mutation.parentTag;

  if (!nodeForTag_.contains(parentTag)) {
    return;
  }

  auto parent = nodeForTag_[parentTag];
  int size = 0, prevIndex = -1, offset = 0;

  for (auto &subNode : parent->children) {
    size += subNode->mutation.index - prevIndex - 1;
    if (mutation.index < size) {
      break;
    }
    offset++;
    prevIndex = subNode->mutation.index;
  }
#ifdef LAYOUT_ANIMATIONS_LOGS
  int tag =
      mutation.type == ShadowViewMutation::Insert ? mutation.newChildShadowView.tag : mutation.oldChildShadowView.tag;
  LOG(INFO) << "update index for " << tag << " in " << parentTag << ": " << mutation.index << " -> "
            << mutation.index + offset << std::endl;
#endif
  mutation.index += offset;
}

bool LayoutAnimationsProxy_Legacy::shouldOverridePullTransaction() const {
  return true;
}

void LayoutAnimationsProxy_Legacy::startEnteringAnimation(
    const int tag,
    ShadowViewMutation &mutation,
    const std::shared_ptr<Serializable> &config) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start entering animation for tag " << tag << std::endl;
#endif
  auto &viewProps = static_cast<const ViewProps &>(*mutation.newChildShadowView.props);
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = tag,
      .type = LayoutAnimationType::ENTERING,
      .before = mutation.newChildShadowView,
      .after = mutation.newChildShadowView,
      .parentTag = mutation.parentTag,
      .opacity = viewProps.opacity,
      .config = config,
  });
}

void LayoutAnimationsProxy_Legacy::startExitingAnimation(
    const int tag,
    ShadowViewMutation &mutation,
    const std::shared_ptr<Serializable> &config) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start exiting animation for tag " << tag << std::endl;
#endif
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = tag,
      .type = LayoutAnimationType::EXITING,
      .before = mutation.oldChildShadowView,
      .after = mutation.oldChildShadowView,
      .parentTag = mutation.parentTag,
      .config = config,
  });
}

void LayoutAnimationsProxy_Legacy::startLayoutAnimation(
    const int tag,
    const ShadowViewMutation &mutation,
    const std::shared_ptr<Serializable> &config) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start layout animation for tag " << tag << std::endl;
#endif
  enqueueLayoutAnimation(ManagedLayoutAnimationStart{
      .tag = tag,
      .type = LayoutAnimationType::LAYOUT,
      .before = mutation.oldChildShadowView,
      .after = mutation.newChildShadowView,
      .parentTag = mutation.parentTag,
      .config = config,
  });
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
std::shared_ptr<ShadowView> LayoutAnimationsProxy_Legacy::cloneViewWithoutOpacity(
    facebook::react::ShadowViewMutation &mutation,
    const PropsParserContext &propsParserContext) const {
  auto newView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps = componentDescriptorRegistry_->at(newView->componentHandle)
                      .cloneProps(propsParserContext, newView->props, RawProps(opacity));
  newView->props = newProps;
  return newView;
}

void Node::applyMutationToIndices(const ShadowViewMutation &mutation) {
  const auto parentTag = mutation.parentTag;
  if (tag != parentTag) {
    return;
  }

  int delta = mutation.type == ShadowViewMutation::Insert ? 1 : -1;
  for (const auto &child : std::views::reverse(children)) {
    if (child->mutation.index < mutation.index) {
      return;
    }
    child->mutation.index += delta;
  }
}

// Should only be called on unflattened parents
void Node::removeChildFromUnflattenedTree(const std::shared_ptr<MutationNode> &child) {
  for (size_t i = unflattenedChildren.size(); i-- > 0;) {
    if (unflattenedChildren[i]->tag == child->tag) {
      unflattenedChildren.erase(unflattenedChildren.begin() + i);
      break;
    }
  }

  auto &flattenedChildren = child->parent->children;
  for (size_t i = flattenedChildren.size(); i-- > 0;) {
    if (flattenedChildren[i]->tag == child->tag) {
      flattenedChildren.erase(flattenedChildren.begin() + i);
      return;
    }
    flattenedChildren[i]->mutation.index--;
  }
}

void Node::insertChildren(std::vector<std::shared_ptr<MutationNode>> &newChildren) {
  mergeAndSwap(children, newChildren);
}

void Node::insertUnflattenedChildren(std::vector<std::shared_ptr<MutationNode>> &newChildren) {
  mergeAndSwap(unflattenedChildren, newChildren);
}

inline bool Node::isMutationNode() {
  return false;
}

inline bool MutationNode::isMutationNode() {
  return true;
}

void LayoutAnimationsProxy_Legacy::shadowTreeWillCommit(const bool isSurfaceRemoval) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  surfaceToRemove_ = isSurfaceRemoval;
}

std::shared_ptr<LayoutAnimationsProxyRegistry> createLayoutAnimationsProxyLegacyRegistry(
    const LayoutAnimationsProxyDependencies &dependencies) {
  return std::make_shared<LayoutAnimationsProxyRegistry>(
      [dependencies](const SurfaceId surfaceId) -> std::shared_ptr<LayoutAnimationsProxyCommon> {
        return std::make_shared<LayoutAnimationsProxy_Legacy>(surfaceId, dependencies);
      });
}

} // namespace reanimated
