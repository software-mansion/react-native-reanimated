#include <react/renderer/mounting/ShadowViewMutation.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h>
#include <reanimated/LayoutAnimations/PropsDiffer.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

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

// MARK: MountingOverrideDelegate

std::optional<MountingTransaction> LayoutAnimationsProxy_Experimental::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
  ReanimatedSystraceSection d("pullTransaction");
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  ShadowViewMutationList filteredMutations;
  auto rootChildCount = static_cast<int>(lightNodes_[surfaceId]->children.size());
  const std::vector<std::shared_ptr<MutationNode>> roots;
  const bool isInTransition = static_cast<bool>(transitionState_);

  if (isInTransition) {
    updateLightTree(propsParserContext, mutations, filteredMutations);
    handleProgressTransition(filteredMutations, mutations, propsParserContext, surfaceId);
  } else if (!synchronized_) {
    auto actualTop = topScreen[surfaceId];
    updateLightTree(propsParserContext, mutations, filteredMutations);
    auto reactTop = findTopScreen(lightNodes_[surfaceId]);
    if (reactTop == actualTop) {
      synchronized_ = true;
    }
  } else if (!mutations.empty()) {
    auto root = lightNodes_[surfaceId];
    react_native_assert(root && "Root node not found");
    auto beforeTopScreen = topScreen[surfaceId];
    if (beforeTopScreen) {
      ReanimatedSystraceSection s("find before elements");
      findSharedElementsOnScreen(beforeTopScreen, BEFORE, propsParserContext);
    }

    updateLightTree(propsParserContext, mutations, filteredMutations);

    auto afterTopScreen = findTopScreen(root);
    topScreen[surfaceId] = afterTopScreen;
    if (afterTopScreen) {
      ReanimatedSystraceSection s("find after elements");
      findSharedElementsOnScreen(afterTopScreen, AFTER, propsParserContext);
#ifdef __APPLE__
      forceScreenSnapshot_(afterTopScreen->current.tag);
#endif
    }
    // Skip the morph when either end of the transition is a modal presented in its own
    // UIViewController: SET mounts its container views at the surface root, which renders behind
    // such a modal, so the morph would flash then be covered. Letting the modal present/dismiss
    // without SET is the clean fallback. Non-modal transitions are unaffected.
    const bool involvesModal = isModalScreen(beforeTopScreen) || isModalScreen(afterTopScreen);
    const bool hasScreenChanged =
        beforeTopScreen && afterTopScreen && beforeTopScreen != afterTopScreen && !involvesModal;

    if (hasScreenChanged) {
      // We want to add mutations to hide the views that will start their transitions.
      // To keep things simple, we put mutations related to source views before all muatations
      // and mutations to hide target views after all mutations.
      std::vector<ShadowViewMutation> mergedMutations;
      hideTransitioningViews(BEFORE, mergedMutations, propsParserContext);
      mergedMutations.insert(mergedMutations.end(), filteredMutations.begin(), filteredMutations.end());
      hideTransitioningViews(AFTER, mergedMutations, propsParserContext);
      std::swap(filteredMutations, mergedMutations);
    }

    if (!involvesModal) {
      handleSharedTransitionsStart(
          afterTopScreen, beforeTopScreen, filteredMutations, mutations, propsParserContext, surfaceId);
    }
  }

  for (auto &node : entering_) {
    startEnteringAnimation(node);
  }
  for (auto &node : layout_) {
    startLayoutAnimation(node);
  }
  entering_.clear();
  layout_.clear();

  handleRemovals(filteredMutations, exiting_);
  exiting_.clear();

  addOngoingAnimations(surfaceId, filteredMutations);

  cleanupAnimations(filteredMutations, propsParserContext, surfaceId);

  transitionMap_.clear();
  transitions_.clear();

  insertContainers(filteredMutations, rootChildCount, surfaceId);

  return MountingTransaction{surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

bool LayoutAnimationsProxy_Experimental::shouldOverridePullTransaction() const {
  // we need to listen to every possible mutation to keep the light tree updated
  return true;
}

// MARK: Light Tree

void LayoutAnimationsProxy_Experimental::updateLightTree(
    const PropsParserContext &propsParserContext,
    const ShadowViewMutationList &mutations,
    ShadowViewMutationList &filteredMutations) const {
  ReanimatedSystraceSection s("updateLightTree");
  std::unordered_set<Tag> inserted, moved, deleted;
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
  // Record which views are being unmounted in THIS transaction so hideTransitioningViews can
  // still hide a shared-element source whose light-tree node we are about to erase below (its
  // native view is removed later in the same transaction, so the hide is safe), without
  // resurrecting genuinely-stale views.
  deletedThisTransaction_ = deleted;

  for (const auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation);
    switch (mutation.type) {
      case ShadowViewMutation::Update: {
        auto nodeIt = lightNodes_.find(mutation.newChildShadowView.tag);
        if (nodeIt == lightNodes_.end() || !nodeIt->second) {
          // The light tree (our mirror of the native registry) can fall out of sync with
          // React's shadow tree when a shared transition overlaps a view remount - React
          // then emits an Update for a tag we no longer track. Pass the mutation through so
          // React still applies it, and skip the light-tree bookkeeping instead of
          // dereferencing a missing node (which otherwise aborts/segfaults the mount).
          filteredMutations.push_back(mutation);
          break;
        }
        auto &node = nodeIt->second;
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
              getComponentDescriptorForShadowView(node->current)
                  .cloneProps(propsParserContext, mutation.newChildShadowView.props, RawProps(mergedRawProps));
        } else {
          node->current = mutation.newChildShadowView;
        }
#else
        node->current = mutation.newChildShadowView;
#endif // ANDROID
        auto tag = mutation.newChildShadowView.tag;
        if (layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)) {
          layout_.push_back(node);
        } else {
          filteredMutations.push_back(mutation);
        }
        break;
      }
      case ShadowViewMutation::Create: {
        const auto &node = std::make_shared<LightNode>();
        node->current = mutation.newChildShadowView;
        // Normally the tag must not already be tracked. If the light tree drifted from
        // React (a stale entry left behind when the mirror desynced under an overlapping
        // shared transition + remount), overwrite it with the fresh node instead of
        // aborting - the assignment below already replaces any stale entry, so this just
        // makes the debug build degrade as gracefully as release does.
        lightNodes_[mutation.newChildShadowView.tag] = node;
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Delete: {
        lightNodes_.erase(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Insert: {
        transferConfigFromNativeID(mutation.newChildShadowView.props->nativeId, mutation.newChildShadowView.tag);
        auto nodeIt = lightNodes_.find(mutation.newChildShadowView.tag);
        auto parentIt = lightNodes_.find(mutation.parentTag);
        if (nodeIt == lightNodes_.end() || !nodeIt->second || parentIt == lightNodes_.end() || !parentIt->second ||
            mutation.index > static_cast<int>(parentIt->second->children.size())) {
          // Light tree out of sync with React (overlapping shared transition + remount): the
          // view or its parent is no longer tracked. Apply the insert to React but skip the
          // light-tree linking rather than dereferencing a missing node.
          filteredMutations.push_back(mutation);
          break;
        }
        auto &node = nodeIt->second;
        auto &parent = parentIt->second;
        parent->children.insert(parent->children.begin() + mutation.index, node);
        node->parent = parent;
        const auto tag = mutation.newChildShadowView.tag;
        if (moved.contains(tag) && layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)) {
          filteredMutations.push_back(
              ShadowViewMutation::InsertMutation(mutation.parentTag, node->previous, mutation.index));
        } else if (layoutAnimationsManager_->hasLayoutAnimation(tag, ENTERING)) {
          entering_.push_back(node);
          filteredMutations.push_back(mutation);
        } else {
          filteredMutations.push_back(mutation);
        }
        break;
      }
      case ShadowViewMutation::Remove: {
        auto nodeIt = lightNodes_.find(mutation.oldChildShadowView.tag);
        auto parentIt = lightNodes_.find(mutation.parentTag);
        if (nodeIt == lightNodes_.end() || !nodeIt->second || parentIt == lightNodes_.end() || !parentIt->second) {
          // Light tree out of sync with React: apply the removal to React but skip the
          // light-tree erase rather than dereferencing a missing node/parent.
          filteredMutations.push_back(mutation);
          break;
        }
        const auto &node = nodeIt->second;
        const auto tag = node->current.tag;
        const auto parentTag = mutation.parentTag;
        const auto &parent = parentIt->second;
        // Locate the child in the light tree BY TAG, not by mutation.index. React's index is
        // relative to React's shadow tree, which excludes the synthetic shared-transition
        // containers we append to parents (and can drift after an earlier desync); erasing by
        // a stale index would remove the wrong child or, worse, leave the removed child in the
        // light tree. Keeping the light tree exactly in sync with native is essential: the
        // container-removal index in cleanupSharedTransitions is derived from the light-tree
        // root children, so a stale (too-large) root child count makes a later container
        // RemoveMutation index run past the native children array - the NSRangeException in
        // -[RCTViewComponentView unmountChildComponentView:index:] seen when pressing Back.
        auto &kids = parent->children;
        int childIndex = -1;
        if (mutation.index >= 0 && mutation.index < static_cast<int>(kids.size()) && kids[mutation.index] &&
            kids[mutation.index]->current.tag == mutation.oldChildShadowView.tag) {
          childIndex = mutation.index;
        } else {
          for (int k = 0; k < static_cast<int>(kids.size()); k++) {
            if (kids[k] && kids[k]->current.tag == mutation.oldChildShadowView.tag) {
              childIndex = k;
              break;
            }
          }
        }
        if (childIndex < 0) {
          // The child isn't tracked under this parent in the light tree; let React apply it.
          filteredMutations.push_back(mutation);
          break;
        }

        if (deleted.contains(tag) && !deleted.contains(parentTag)) {
          exiting_.push_back(node);
          filteredMutations.push_back(mutation);
          kids.erase(kids.begin() + childIndex);
        } else if (!deleted.contains(tag)) {
          filteredMutations.push_back(mutation);
          kids.erase(kids.begin() + childIndex);
        }
        // else: tag and its parent are both being deleted. React tears down the subtree
        // wholesale, so we must neither re-emit this Remove nor erase the node from the light
        // tree here. handleRemovals walks the still-present light-tree children of the exiting
        // parent and emits each child's native RemoveMutation/DeleteMutation (see
        // startAnimationsRecursively, which iterates node->children). Erasing the child here
        // drops it before that walk, so its native view is never removed and is stranded on
        // screen as stale, overlapping content (e.g. the examples list bleeding through a
        // pushed screen). Leaving it lets handleRemovals remove it and keep the mirror synced.
        break;
      }
      default: {
        react_native_assert(false && "Unsupported mutation type");
        break;
      }
    }
  }
}

// MARK: Layout Animation Updates

std::optional<SurfaceId> LayoutAnimationsProxy_Experimental::progressLayoutAnimation(
    int tag,
    const jsi::Object &newStyle) {
  ReanimatedSystraceSection s("progressLayoutAnimation");
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;

  maybeRestoreOpacity(layoutAnimation, newStyle);

  auto rawProps = std::make_shared<RawProps>(uiRuntime_, jsi::Value(uiRuntime_, newStyle));

  const PropsParserContext propsParserContext{layoutAnimation.finalView.surfaceId, *contextContainer_};
#ifdef RN_SERIALIZABLE_STATE
  rawProps = std::make_shared<RawProps>(
      folly::dynamic::merge(layoutAnimation.finalView.props->rawProps, (folly::dynamic)*rawProps));
#endif
  auto newProps = getComponentDescriptorForShadowView(layoutAnimation.finalView)
                      .cloneProps(propsParserContext, layoutAnimation.finalView.props, std::move(*rawProps));
  auto &updateMap = surfaceManager.getUpdateMap(layoutAnimation.finalView.surfaceId);
  updateMap.insert_or_assign(tag, UpdateValues{newProps, Frame(uiRuntime_, newStyle)});

  return layoutAnimation.finalView.surfaceId;
}

std::optional<SurfaceId> LayoutAnimationsProxy_Experimental::endLayoutAnimation(int tag, bool shouldRemove) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;

  // multiple layout animations can be triggered for a view
  // one after the other, so we need to keep count of how many
  // were actually triggered, so that we don't cleanup necessary
  // structures too early
  if (layoutAnimation.count > 1) {
    layoutAnimation.count--;
    return {};
  }
  finishedAnimationTags_.push_back(tag);
  auto surfaceId = layoutAnimation.finalView.surfaceId;

  // Only run the shared-transition container teardown when this ending animation actually belongs
  // to a container we created. Previously this checked tagToName_.contains(tag), which is also true
  // for a regular shared-element source view (registered via transferConfigFromNativeID). A view
  // that has both a sharedTransitionTag and layout={Layout} would then, on every layout-animation
  // end, be wrongly scheduled into sharedContainersToRemove_ and erased from lightNodes_ while still
  // mounted - stranding it in its parent's children and causing a double-remove (NSRangeException)
  // on a later teardown. Reproduced with [SET] Change theme: toggle a few times, then press back.
  if (ownedContainers_.contains(tag)) {
    auto sharedTag = sharedTransitionManager_->tagToName_[tag];
    sharedTransitionManager_->containerTags_.erase(sharedTag);

    sharedContainersToRemove_.push_back(tag);
    tagsToRestore_.push_back(restoreMap_[tag][1]);
    transformForNode_.clear();
  }
  if (!shouldRemove) {
    return surfaceId;
  }

  auto node = lightNodes_[tag];
  react_native_assert(node && "LightNode not found");

  node->state = DEAD;
  lightNodes_.erase(tag);
  deadNodes.insert(node);

  return surfaceId;
}

void LayoutAnimationsProxy_Experimental::handleRemovals(
    ShadowViewMutationList &filteredMutations,
    std::vector<std::shared_ptr<LightNode>> &roots) const {
  ReanimatedSystraceSection s("handleRemovals");
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = roots.rbegin(); it != roots.rend(); it++) {
    auto &node = *it;

    const StartAnimationsRecursivelyConfig config = {
        .shouldRemoveSubviewsWithoutAnimations = true,
        .shouldAnimate = true,
        .isScreenPop = false,
    };

    if (startAnimationsRecursively(node, filteredMutations, config)) {
      auto parent = node->parent.lock();
      react_native_assert(parent && "Parent node is nullptr");
      // TODO (future): figure out a better way to handle this
      // Currently we remove each view, and then if we want to animate it, reinsert it at the end.
      // This is nice, but introduces extra mutations (which could have some side effects, like making a snapshot in
      // RNScreens), and it changes the zIndex of animated views, which is different from what've had. The biggest
      // convenience of this approach is that it is much easier to maintain indices of animated views, and handle
      // reparentings.

      auto current = node->current;
      if (layoutAnimations_.contains(node->current.tag)) {
        current = layoutAnimations_.at(node->current.tag).currentView;
      }
      filteredMutations.push_back(
          ShadowViewMutation::InsertMutation(parent->current.tag, current, static_cast<int>(parent->children.size())));
      parent->children.push_back(node);
      if (node->state == UNDEFINED) {
        node->state = WAITING;
      }
    } else {
      maybeCancelAnimation(node->current.tag);
      filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
    }
  }

  for (const auto &node : deadNodes) {
    if (node->state != DELETED) {
      auto parent = node->parent.lock();
      react_native_assert(parent && "Parent node is nullptr");
      auto index = parent->removeChild(node);
      react_native_assert(index != -1 && "Dead node not found");

      endAnimationsRecursively(node, index, filteredMutations);
      maybeDropAncestors(parent, filteredMutations);
    }
  }
  deadNodes.clear();
}

void LayoutAnimationsProxy_Experimental::addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList &mutations)
    const {
  ReanimatedSystraceSection s1("addOngoingAnimations");
  auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
#ifdef ANDROID
  std::vector<int> tagsToUpdate;
  tagsToUpdate.reserve(updateMap.size());
  for (auto &[tag, updateValues] : updateMap) {
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
  for (auto &[tag, updateValues] : updateMap) {
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

    const auto layoutAnimationIt = layoutAnimations_.find(tag);

    if (layoutAnimationIt == layoutAnimations_.end()) {
      continue;
    }

    // The animated view (or shared-transition container) may have been unmounted while
    // its animation was still ongoing - e.g. when a navigator removes a screen mid
    // shared transition, which happens when transitioning across tabs/detached screens.
    // Emitting an UpdateMutation for a tag whose native view is no longer registered
    // aborts the Fabric mount with "Attempt to query unregistered component". Skip it.
    const auto nodeIt = lightNodes_.find(tag);
    if (nodeIt == lightNodes_.end() || !nodeIt->second) {
      continue;
    }

    auto &layoutAnimation = layoutAnimationIt->second;
    layoutAnimation.isViewAlreadyMounted = true;
    auto newView = layoutAnimation.finalView;
    if (updateValues.newProps) {
      newView.props = updateValues.newProps;
    }
    updateLayoutMetrics(newView.layoutMetrics, updateValues.frame);

    mutations.push_back(
        ShadowViewMutation::UpdateMutation(layoutAnimation.currentView, newView, layoutAnimation.parentTag));
    layoutAnimation.currentView = newView;
  }
  updateMap.clear();
}

void LayoutAnimationsProxy_Experimental::endAnimationsRecursively(
    const std::shared_ptr<LightNode> &node,
    int index,
    ShadowViewMutationList &mutations) const {
  maybeCancelAnimation(node->current.tag);
  node->state = DELETED;
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list

  const int childrenSize = static_cast<int>(node->children.size());
  for (int i = childrenSize - 1; i >= 0; i--) {
    auto &subNode = node->children[i];
    if (subNode->state != DELETED) {
      endAnimationsRecursively(subNode, i, mutations);
    }
  }
  node->children.clear();

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

  node->state = DELETED;
  maybeCancelAnimation(node->current.tag);
  cleanupMutations.push_back(ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, index));
  cleanupMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
  maybeDropAncestors(parent, cleanupMutations);
}

const ComponentDescriptor &LayoutAnimationsProxy_Experimental::getComponentDescriptorForShadowView(
    const ShadowView &shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
}

bool LayoutAnimationsProxy_Experimental::startAnimationsRecursively(
    const std::shared_ptr<LightNode> &node,
    ShadowViewMutationList &mutations,
    StartAnimationsRecursivelyConfig config) const {
  auto &[shouldRemoveSubviewsWithoutAnimations, shouldAnimate, isScreenPop] = config;
  if (isRNSScreenOrStack(node)) {
    isScreenPop = true;
  }

  shouldAnimate = !isScreenPop && layoutAnimationsManager_->shouldAnimateExiting(node->current.tag, shouldAnimate);

  const bool hasExitAnimation =
      shouldAnimate && layoutAnimationsManager_->hasLayoutAnimation(node->current.tag, LayoutAnimationType::EXITING);
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
    } else if (startAnimationsRecursively(subNode, mutations, config)) {
      hasAnimatedChildren = true;
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      maybeCancelAnimation(subNode->current.tag);
      mutations.push_back(ShadowViewMutation::RemoveMutation(node->current.tag, subNode->current, index));
      toBeRemoved.push_back(subNode);
      subNode->state = DELETED;
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->current));
    } else {
      subNode->state = WAITING;
    }
  }

  for (auto &subNode : toBeRemoved) {
    node->removeChild(subNode);
  }

  const bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->state = ANIMATING;
    startExitingAnimation(node);
    lightNodes_[node->current.tag] = node;
  } else {
    // TODO (future): add proper cleanup
    //    layoutAnimationsManager_->clearLayoutAnimationConfig(node->tag);
  }

  return wantAnimateExit;
}

void LayoutAnimationsProxy_Experimental::updateOngoingAnimationTarget(const int tag, const ShadowViewMutation &mutation)
    const {
  layoutAnimations_[tag].finalView = mutation.newChildShadowView;
}

void LayoutAnimationsProxy_Experimental::maybeCancelAnimation(const int tag) const {
  if (!layoutAnimations_.contains(tag)) {
    return;
  }
  layoutAnimations_.erase(tag);
  scheduleOnUI(uiScheduler_, [weakThis = weak_from_this(), tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto &uiRuntime = strongThis->uiRuntime_;
    strongThis->layoutAnimationsManager_->cancelLayoutAnimation(uiRuntime, tag);
  });
}

void LayoutAnimationsProxy_Experimental::transferConfigFromNativeID(const std::string &nativeIdString, const int tag)
    const {
  if (nativeIdString.empty() || nativeIdString.length() > 9) {
    return;
  }
  auto nativeId = 0;
  for (int i = 0; i < nativeIdString.length(); i++) {
    if (nativeIdString[i] < '0' || nativeIdString[i] > '9') {
      return;
    }
    nativeId *= 10;
    nativeId += nativeIdString[i] - '0';
  }

  layoutAnimationsManager_->transferConfigFromNativeID(nativeId, tag);
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
ShadowView LayoutAnimationsProxy_Experimental::cloneViewWithoutOpacity(
    const ShadowView &shadowView,
    const PropsParserContext &propsParserContext) const {
  auto newView = shadowView;
  const folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps =
      getComponentDescriptorForShadowView(newView).cloneProps(propsParserContext, newView.props, RawProps(opacity));
  newView.props = newProps;
  return newView;
}

ShadowView LayoutAnimationsProxy_Experimental::cloneViewWithOpacity(
    const ShadowView &shadowView,
    const PropsParserContext &propsParserContext) const {
  auto newView = shadowView;
  const auto &props = static_cast<const ViewProps &>(*newView.props);
  const folly::dynamic opacity = folly::dynamic::object("opacity", props.opacity);
  auto newProps =
      getComponentDescriptorForShadowView(newView).cloneProps(propsParserContext, newView.props, RawProps(opacity));
  newView.props = newProps;
  return newView;
}

void LayoutAnimationsProxy_Experimental::maybeRestoreOpacity(
    reanimated::LayoutAnimation &layoutAnimation,
    const jsi::Object &newStyle) const {
  if (layoutAnimation.opacity && !newStyle.hasProperty(uiRuntime_, "opacity")) {
    newStyle.setProperty(uiRuntime_, "opacity", jsi::Value(*layoutAnimation.opacity));
    if (layoutAnimation.isViewAlreadyMounted) {
      // We want to reset opacity only when we are sure that this update will be
      // applied to the native view. Otherwise, we want to update opacity using
      // the `restoreOpacityInCaseOfFlakyEnteringAnimation` method.
      layoutAnimation.opacity.reset();
    }
  }
}

void LayoutAnimationsProxy_Experimental::maybeUpdateWindowDimensions(
    const facebook::react::ShadowViewMutation &mutation) const {
  if (mutation.type == ShadowViewMutation::Update &&
      !std::strcmp(mutation.oldChildShadowView.componentName, RootComponentName)) {
    surfaceManager.updateWindow(
        mutation.newChildShadowView.tag,
        mutation.newChildShadowView.layoutMetrics.frame.size.width,
        mutation.newChildShadowView.layoutMetrics.frame.size.height);
  }
}

void LayoutAnimationsProxy_Experimental::cleanupAnimations(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  ReanimatedSystraceSection s("cleanupAnimations");
  cleanupSharedTransitions(filteredMutations, propsParserContext, surfaceId);

#ifdef ANDROID
  restoreOpacityInCaseOfFlakyEnteringAnimation(surfaceId);
#endif // ANDROID
  for (const auto tag : finishedAnimationTags_) {
    auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
    layoutAnimations_.erase(tag);
    updateMap.erase(tag);
  }
  finishedAnimationTags_.clear();
}

// MARK: Start Animation

ShadowView LayoutAnimationsProxy_Experimental::maybeCreateLayoutAnimation(
    ShadowView &before,
    const ShadowView &after,
    const Tag parentTag) const {
  auto count = 1;
  const auto tag = after.tag;
  auto layoutAnimationIt = layoutAnimations_.find(tag);
  auto &oldView = before;

  if (layoutAnimationIt != layoutAnimations_.end()) {
    auto &layoutAnimation = layoutAnimationIt->second;
    oldView = layoutAnimation.currentView;
    count = layoutAnimation.count + 1;
  }

  auto finalView = after;
  auto currentView = oldView;
  auto startView = oldView;

  layoutAnimations_[tag] = {
      .finalView = finalView,
      .currentView = currentView,
      .startView = startView,
      .parentTag = parentTag,
      .count = count,
  };

  return oldView;
}

void LayoutAnimationsProxy_Experimental::startEnteringAnimation(const std::shared_ptr<LightNode> &node) const {
  auto newChildShadowView = node->current;
  const auto &finalView = newChildShadowView;
  const auto &currentView = newChildShadowView;

  const auto &props = newChildShadowView.props;
  auto &viewProps = static_cast<const ViewProps &>(*props);
  const auto opacity = viewProps.opacity;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  const auto parentTag = parent->current.tag;

  scheduleOnUI(
      uiScheduler_, [weakThis = weak_from_this(), finalView, currentView, newChildShadowView, parentTag, opacity]() {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }

        Rect window;
        const auto tag = newChildShadowView.tag;
        {
          auto lock = std::unique_lock<std::recursive_mutex>(strongThis->mutex);
          strongThis->layoutAnimations_[tag] = {
              .finalView = newChildShadowView,
              .currentView = newChildShadowView,
              .startView = newChildShadowView,
              .parentTag = parentTag,
              .opacity = opacity,
          };
          window = strongThis->surfaceManager.getWindow(newChildShadowView.surfaceId);
        }

        const Snapshot values(newChildShadowView, window);
        auto &uiRuntime = strongThis->uiRuntime_;
        const jsi::Object yogaValues(uiRuntime);
        yogaValues.setProperty(uiRuntime, "targetOriginX", values.x);
        yogaValues.setProperty(uiRuntime, "targetGlobalOriginX", values.x);
        yogaValues.setProperty(uiRuntime, "targetOriginY", values.y);
        yogaValues.setProperty(uiRuntime, "targetGlobalOriginY", values.y);
        yogaValues.setProperty(uiRuntime, "targetWidth", values.width);
        yogaValues.setProperty(uiRuntime, "targetHeight", values.height);
        yogaValues.setProperty(uiRuntime, "windowWidth", values.windowWidth);
        yogaValues.setProperty(uiRuntime, "windowHeight", values.windowHeight);
        strongThis->layoutAnimationsManager_->startLayoutAnimation(
            uiRuntime, tag, LayoutAnimationType::ENTERING, yogaValues);
      });
}

void LayoutAnimationsProxy_Experimental::startExitingAnimation(const std::shared_ptr<LightNode> &node) const {
  auto &oldChildShadowView = node->current;
  const auto surfaceId = oldChildShadowView.surfaceId;
  const auto tag = oldChildShadowView.tag;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  const auto parentTag = parent->current.tag;

  scheduleOnUI(uiScheduler_, [weakThis = weak_from_this(), tag, parentTag, oldChildShadowView, surfaceId]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = oldChildShadowView;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      oldView = strongThis->maybeCreateLayoutAnimation(oldView, oldView, parentTag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    const Snapshot values(oldView, window);

    auto &uiRuntime = strongThis->uiRuntime_;
    const jsi::Object yogaValues(uiRuntime);
    yogaValues.setProperty(uiRuntime, "currentOriginX", values.x);
    yogaValues.setProperty(uiRuntime, "currentGlobalOriginX", values.x);
    yogaValues.setProperty(uiRuntime, "currentOriginY", values.y);
    yogaValues.setProperty(uiRuntime, "currentGlobalOriginY", values.y);
    yogaValues.setProperty(uiRuntime, "currentWidth", values.width);
    yogaValues.setProperty(uiRuntime, "currentHeight", values.height);
    yogaValues.setProperty(uiRuntime, "windowWidth", values.windowWidth);
    yogaValues.setProperty(uiRuntime, "windowHeight", values.windowHeight);
    strongThis->layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime, tag, LayoutAnimationType::EXITING, yogaValues);
    strongThis->layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
  });
}

void LayoutAnimationsProxy_Experimental::startLayoutAnimation(const std::shared_ptr<LightNode> &node) const {
  auto oldChildShadowView = node->previous;
  auto newChildShadowView = node->current;
  auto surfaceId = oldChildShadowView.surfaceId;
  const auto tag = oldChildShadowView.tag;
  const auto &parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  const auto parentTag = parent->current.tag;

  scheduleOnUI(
      uiScheduler_, [weakThis = weak_from_this(), surfaceId, oldChildShadowView, newChildShadowView, parentTag, tag]() {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }

        auto oldView = oldChildShadowView;
        Rect window{};
        {
          auto &mutex = strongThis->mutex;
          auto lock = std::unique_lock<std::recursive_mutex>(mutex);
          oldView = strongThis->maybeCreateLayoutAnimation(oldView, newChildShadowView, parentTag);
          window = strongThis->surfaceManager.getWindow(surfaceId);
        }

        const Snapshot currentValues(oldView, window);
        const Snapshot targetValues(newChildShadowView, window);

        auto &uiRuntime = strongThis->uiRuntime_;
        const jsi::Object yogaValues(uiRuntime);
        yogaValues.setProperty(uiRuntime, "currentOriginX", currentValues.x);
        yogaValues.setProperty(uiRuntime, "currentGlobalOriginX", currentValues.x);
        yogaValues.setProperty(uiRuntime, "currentOriginY", currentValues.y);
        yogaValues.setProperty(uiRuntime, "currentGlobalOriginY", currentValues.y);
        yogaValues.setProperty(uiRuntime, "currentWidth", currentValues.width);
        yogaValues.setProperty(uiRuntime, "currentHeight", currentValues.height);
        yogaValues.setProperty(uiRuntime, "targetOriginX", targetValues.x);
        yogaValues.setProperty(uiRuntime, "targetGlobalOriginX", targetValues.x);
        yogaValues.setProperty(uiRuntime, "targetOriginY", targetValues.y);
        yogaValues.setProperty(uiRuntime, "targetGlobalOriginY", targetValues.y);
        yogaValues.setProperty(uiRuntime, "targetWidth", targetValues.width);
        yogaValues.setProperty(uiRuntime, "targetHeight", targetValues.height);
        yogaValues.setProperty(uiRuntime, "windowWidth", targetValues.windowWidth);
        yogaValues.setProperty(uiRuntime, "windowHeight", targetValues.windowHeight);
        strongThis->layoutAnimationsManager_->startLayoutAnimation(
            uiRuntime, tag, LayoutAnimationType::LAYOUT, yogaValues);
      });
}

void LayoutAnimationsProxy_Experimental::startSharedTransition(
    const int tag,
    const ShadowView &before,
    const ShadowView &after,
    SurfaceId surfaceId) const {
  scheduleOnUI(uiScheduler_, [weakThis = weak_from_this(), before, after, surfaceId, tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = before;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      oldView = strongThis->maybeCreateLayoutAnimation(oldView, after, surfaceId);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    auto &uiRuntime = strongThis->uiRuntime_;
    auto propsDiffer = PropsDiffer(uiRuntime, oldView, after);

    const auto &propsDiff = propsDiffer.computeDiff(uiRuntime);

    propsDiff.setProperty(uiRuntime, "windowWidth", window.width);
    propsDiff.setProperty(uiRuntime, "windowHeight", window.height);

    strongThis->layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime, tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION, propsDiff);
  });
}

void LayoutAnimationsProxy_Experimental::startProgressTransition(
    const int tag,
    const ShadowView &before,
    const ShadowView &after,
    SurfaceId surfaceId) const {
  scheduleOnUI(uiScheduler_, [weakThis = weak_from_this(), before, after, surfaceId]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = before;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      oldView = strongThis->maybeCreateLayoutAnimation(oldView, after, surfaceId);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }
  });
}

} // namespace reanimated
