#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <react/renderer/animations/utils.h>
#include <react/renderer/mounting/ShadowViewMutation.h>

#include <memory>
#include <ranges>
#include <set>
#include <string>
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
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  ShadowViewMutationList filteredMutations;
  auto &[deadNodes] = surfaceContext_[surfaceId];

  std::vector<std::shared_ptr<MutationNode>> roots;
  std::unordered_map<Tag, Tag> movedViews;

  addOngoingAnimations(surfaceId, filteredMutations);

#ifdef ANDROID
  restoreOpacityInCaseOfFlakyEnteringAnimation(surfaceId);
#endif // ANDROID
  for (const auto tag : finishedAnimationTags_) {
    auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
    layoutAnimations_.erase(tag);
    updateMap.erase(tag);
  }
  finishedAnimationTags_.clear();

  parseRemoveMutations(movedViews, mutations, roots);

  auto shouldAnimate = !surfacesToRemove_.contains(surfaceId);
  surfacesToRemove_.erase(surfaceId);
  handleRemovals(filteredMutations, roots, deadNodes, shouldAnimate);

  handleUpdatesAndEnterings(filteredMutations, movedViews, mutations, propsParserContext, surfaceId);

  addOngoingAnimations(surfaceId, filteredMutations);

  return MountingTransaction{surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

std::optional<SurfaceId> LayoutAnimationsProxy_Legacy::progressLayoutAnimation(int tag, const jsi::Object &newStyle) {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "progress layout animation for tag " << tag << std::endl;
#endif
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;

  maybeRestoreOpacity(layoutAnimation, newStyle);

  auto rawProps = std::make_shared<RawProps>(uiRuntime_, jsi::Value(uiRuntime_, newStyle));

  PropsParserContext propsParserContext{layoutAnimation.finalView.surfaceId, *contextContainer_};
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

std::optional<SurfaceId> LayoutAnimationsProxy_Legacy::endLayoutAnimation(int tag, bool shouldRemove) {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "end layout animation for " << tag << " - should remove " << shouldRemove << std::endl;
#endif
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

  if (!shouldRemove || !nodeForTag_.contains(tag)) {
    return {};
  }

  auto node = nodeForTag_[tag];
  auto mutationNode = std::static_pointer_cast<MutationNode>(node);
  mutationNode->state = DEAD;
  auto &[deadNodes] = surfaceContext_[surfaceId];
  deadNodes.insert(mutationNode);

  return surfaceId;
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
      auto unflattenedParentTag = parentTag; // temporary

      std::shared_ptr<MutationNode> mutationNode;
      std::shared_ptr<Node> node = nodeForTag_[tag], parent = nodeForTag_[parentTag],
                            unflattenedParent = nodeForTag_[unflattenedParentTag];

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
        mutationNode->state = MOVED;
        movedViews.insert_or_assign(mutation.oldChildShadowView.tag, -1);
      }
      nodeForTag_[tag] = mutationNode;

      if (!parent) {
        parent = std::make_shared<Node>(parentTag);
        nodeForTag_[parentTag] = parent;
      }

      if (!unflattenedParent) {
        if (parentTag == unflattenedParentTag) {
          unflattenedParent = parent;
        } else {
          unflattenedParent = std::make_shared<Node>(unflattenedParentTag);
          nodeForTag_[unflattenedParentTag] = unflattenedParent;
        }
      }

      mutationNodes.push_back(mutationNode);

      childrenForTag[parentTag].push_back(mutationNode);
      unflattenedChildrenForTag[unflattenedParentTag].push_back(mutationNode);
      mutationNode->parent = parent;
      mutationNode->unflattenedParent = unflattenedParent;
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
    std::unordered_set<std::shared_ptr<MutationNode>> &deadNodes,
    bool shouldAnimate) const {
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = roots.rbegin(); it != roots.rend(); it++) {
    auto &node = *it;
    if (!startAnimationsRecursively(node, true, shouldAnimate, false, filteredMutations)) {
      filteredMutations.push_back(node->mutation);
      node->unflattenedParent->removeChildFromUnflattenedTree(node); //???
      if (node->state != MOVED) {
        maybeCancelAnimation(node->tag);
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
        nodeForTag_.erase(node->tag);
        node->state = DELETED;
#ifdef LAYOUT_ANIMATIONS_LOGS
        LOG(INFO) << "delete " << node->tag << std::endl;
#endif
      }
    }
  }

  for (const auto &node : deadNodes) {
    if (node->state != DELETED) {
      endAnimationsRecursively(node, filteredMutations);
      maybeDropAncestors(node->unflattenedParent, node, filteredMutations);
    }
  }
  deadNodes.clear();
}

void LayoutAnimationsProxy_Legacy::handleUpdatesAndEnterings(
    ShadowViewMutationList &filteredMutations,
    const std::unordered_map<Tag, Tag> &movedViews,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  std::unordered_map<Tag, ShadowView> oldShadowViewsForReparentings;
  for (auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation, surfaceId);

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
        const auto mutationParent = parentTag;
        if (nodeForTag_.contains(parentTag)) {
          nodeForTag_[parentTag]->applyMutationToIndices(mutation);
        }

        if (movedViews.contains(tag)) {
          auto layoutAnimationIt = layoutAnimations_.find(tag);
          if (layoutAnimationIt == layoutAnimations_.end()) {
            if (oldShadowViewsForReparentings.contains(tag)) {
              filteredMutations.push_back(ShadowViewMutation::InsertMutation(
                  mutationParent, oldShadowViewsForReparentings[tag], mutation.index));
            } else {
              filteredMutations.push_back(mutation);
            }
            continue;
          }

          auto oldView = layoutAnimationIt->second.currentView;
          filteredMutations.push_back(ShadowViewMutation::InsertMutation(mutationParent, oldView, mutation.index));
          if (movedViews.contains(tag)) {
            layoutAnimationIt->second.parentTag = movedViews.at(tag);
          }
          continue;
        }

        transferConfigFromNativeID(mutation.newChildShadowView.props->nativeId, mutation.newChildShadowView.tag);
        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, LayoutAnimationType::ENTERING)) {
          filteredMutations.push_back(mutation);
          continue;
        }

        startEnteringAnimation(tag, mutation);
        filteredMutations.push_back(mutation);

        // temporarily set opacity to 0 to prevent flickering on android
        std::shared_ptr<ShadowView> newView = cloneViewWithoutOpacity(mutation, propsParserContext);

        filteredMutations.push_back(
            ShadowViewMutation::UpdateMutation(mutation.newChildShadowView, *newView, mutationParent));
        break;
      }

      case ShadowViewMutation::Type::Update: {
        auto shouldAnimate = hasLayoutChanged(mutation);
        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, LayoutAnimationType::LAYOUT) ||
            (!shouldAnimate && !layoutAnimations_.contains(tag))) {
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
          updateOngoingAnimationTarget(tag, mutation);
          continue;
        }

        // store the oldChildShadowView, so that we can use this ShadowView when
        // the view is inserted
        oldShadowViewsForReparentings[tag] = mutation.oldChildShadowView;
        if (movedViews.contains(tag)) {
          mutation.parentTag = movedViews.at(tag);
        }
        if (mutation.parentTag != -1) {
          startLayoutAnimation(tag, mutation);
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

void LayoutAnimationsProxy_Legacy::addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList &mutations) const {
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

    auto layoutAnimationIt = layoutAnimations_.find(tag);

    if (layoutAnimationIt == layoutAnimations_.end()) {
      continue;
    }

    auto &layoutAnimation = layoutAnimationIt->second;
    layoutAnimation.isViewAlreadyMounted = true;
    auto newView = layoutAnimation.finalView;
    newView.props = updateValues.newProps;
    updateLayoutMetrics(newView.layoutMetrics, updateValues.frame);

    mutations.push_back(
        ShadowViewMutation::UpdateMutation(layoutAnimation.currentView, newView, layoutAnimation.parentTag));
    layoutAnimation.currentView = newView;
  }
  updateMap.clear();
}

void LayoutAnimationsProxy_Legacy::endAnimationsRecursively(
    const std::shared_ptr<MutationNode> &node,
    ShadowViewMutationList &mutations) const {
  maybeCancelAnimation(node->tag);
  node->state = DELETED;
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = node->unflattenedChildren.rbegin(); it != node->unflattenedChildren.rend(); it++) {
    auto &subNode = *it;
    if (subNode->state != DELETED) {
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

  if (node->children.size() == 0 && node->state != ANIMATING) {
    nodeForTag_.erase(node->tag);
    cleanupMutations.push_back(node->mutation);
    maybeCancelAnimation(node->tag);
    node->state = DELETED;
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "delete " << node->tag << std::endl;
#endif
    cleanupMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
    maybeDropAncestors(node->unflattenedParent, node, cleanupMutations);
  }
}

const ComponentDescriptor &LayoutAnimationsProxy_Legacy::getComponentDescriptorForShadowView(
    const ShadowView &shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
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

  bool hasExitAnimation =
      shouldAnimate && layoutAnimationsManager_->hasLayoutAnimation(node->tag, LayoutAnimationType::EXITING);
  bool hasAnimatedChildren = false;

  shouldRemoveSubviewsWithoutAnimations =
      shouldRemoveSubviewsWithoutAnimations && (!hasExitAnimation || node->state == MOVED);
  std::vector<std::shared_ptr<MutationNode>> toBeRemoved;

  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = node->unflattenedChildren.rbegin(); it != node->unflattenedChildren.rend(); it++) {
    auto &subNode = *it;
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "child " << subNode->tag << " "
              << " " << shouldAnimate << " " << shouldRemoveSubviewsWithoutAnimations << std::endl;
#endif
    if (subNode->state != UNDEFINED && subNode->state != MOVED) {
      if (shouldAnimate && subNode->state != DEAD) {
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
    } else if (subNode->state == MOVED) {
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      maybeCancelAnimation(subNode->tag);
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
      subNode->state = DELETED;
      nodeForTag_.erase(subNode->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "delete " << subNode->tag << std::endl;
#endif
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->mutation.oldChildShadowView));
    } else {
      subNode->state = WAITING;
    }
  }

  for (auto &subNode : toBeRemoved) {
    node->removeChildFromUnflattenedTree(subNode);
  }

  if (node->state == MOVED) {
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
    node->state = ANIMATING;
    startExitingAnimation(node->tag, node->mutation);
  } else {
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

void LayoutAnimationsProxy_Legacy::createLayoutAnimation(
    const ShadowViewMutation &mutation,
    ShadowView &oldView,
    const SurfaceId &surfaceId,
    const int tag) const {
  int count = 1;
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt != layoutAnimations_.end()) {
    auto &layoutAnimation = layoutAnimationIt->second;
    oldView = layoutAnimation.currentView;
    count = layoutAnimation.count + 1;
  }

  auto finalView =
      mutation.type == ShadowViewMutation::Remove ? mutation.oldChildShadowView : mutation.newChildShadowView;
  auto currentView = oldView;

  layoutAnimations_.insert_or_assign(
      tag,
      LayoutAnimation{
          .finalView = finalView,
          .currentView = currentView,
          .parentTag = mutation.parentTag,
          .opacity = {},
          .isViewAlreadyMounted = false,
          .count = count});
}

void LayoutAnimationsProxy_Legacy::startEnteringAnimation(const int tag, ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start entering animation for tag " << tag << std::endl;
#endif
  auto finalView = mutation.newChildShadowView;
  auto current = mutation.newChildShadowView;

  auto &viewProps = static_cast<const ViewProps &>(*mutation.newChildShadowView.props);
  auto opacity = viewProps.opacity;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(), finalView, current, mutation, opacity, tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      strongThis->layoutAnimations_.insert_or_assign(
          tag,
          LayoutAnimation{
              .finalView = finalView, .currentView = current, .parentTag = mutation.parentTag, .opacity = opacity});
      window = strongThis->surfaceManager.getWindow(mutation.newChildShadowView.surfaceId);
    }

    Snapshot values(mutation.newChildShadowView, window);
    auto &uiRuntime = strongThis->uiRuntime_;
    jsi::Object yogaValues(uiRuntime);
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

void LayoutAnimationsProxy_Legacy::startExitingAnimation(const int tag, ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start exiting animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.oldChildShadowView.surfaceId;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(), tag, mutation, surfaceId]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = mutation.oldChildShadowView;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      strongThis->createLayoutAnimation(mutation, oldView, surfaceId, tag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    Snapshot values(oldView, window);

    auto &uiRuntime = strongThis->uiRuntime_;
    jsi::Object yogaValues(uiRuntime);
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

void LayoutAnimationsProxy_Legacy::startLayoutAnimation(const int tag, const ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start layout animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.oldChildShadowView.surfaceId;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(), mutation, surfaceId, tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = mutation.oldChildShadowView;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      strongThis->createLayoutAnimation(mutation, oldView, surfaceId, tag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    Snapshot currentValues(oldView, window);
    Snapshot targetValues(mutation.newChildShadowView, window);

    auto &uiRuntime = strongThis->uiRuntime_;
    jsi::Object yogaValues(uiRuntime);
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
    strongThis->layoutAnimationsManager_->startLayoutAnimation(uiRuntime, tag, LayoutAnimationType::LAYOUT, yogaValues);
  });
}

void LayoutAnimationsProxy_Legacy::updateOngoingAnimationTarget(const int tag, const ShadowViewMutation &mutation)
    const {
  auto copy = mutation.newChildShadowView;
  layoutAnimations_[tag].finalView = copy;
}

void LayoutAnimationsProxy_Legacy::maybeCancelAnimation(const int tag) const {
  if (!layoutAnimations_.contains(tag)) {
    return;
  }
  layoutAnimations_.erase(tag);
  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(), tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto &uiRuntime = strongThis->uiRuntime_;
    strongThis->layoutAnimationsManager_->cancelLayoutAnimation(uiRuntime, tag);
  });
}

void LayoutAnimationsProxy_Legacy::transferConfigFromNativeID(const std::string &nativeIdString, const int tag) const {
  if (nativeIdString.empty()) {
    return;
  }
  try {
    auto nativeId = stoi(nativeIdString);
    layoutAnimationsManager_->transferConfigFromNativeID(nativeId, tag);
  } catch (std::invalid_argument) {
  } catch (std::out_of_range) {}
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
std::shared_ptr<ShadowView> LayoutAnimationsProxy_Legacy::cloneViewWithoutOpacity(
    facebook::react::ShadowViewMutation &mutation,
    const PropsParserContext &propsParserContext) const {
  auto newView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps =
      getComponentDescriptorForShadowView(*newView).cloneProps(propsParserContext, newView->props, RawProps(opacity));
  newView->props = newProps;
  return newView;
}

void LayoutAnimationsProxy_Legacy::maybeRestoreOpacity(LayoutAnimation &layoutAnimation, const jsi::Object &newStyle)
    const {
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

void LayoutAnimationsProxy_Legacy::maybeUpdateWindowDimensions(
    facebook::react::ShadowViewMutation &mutation,
    SurfaceId surfaceId) const {
  if (mutation.type == ShadowViewMutation::Update &&
      !std::strcmp(mutation.oldChildShadowView.componentName, RootComponentName)) {
    surfaceManager.updateWindow(
        surfaceId,
        mutation.newChildShadowView.layoutMetrics.frame.size.width,
        mutation.newChildShadowView.layoutMetrics.frame.size.height);
  }
}

void Node::applyMutationToIndices(ShadowViewMutation mutation) {
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
void Node::removeChildFromUnflattenedTree(std::shared_ptr<MutationNode> child) {
  for (int i = unflattenedChildren.size() - 1; i >= 0; i--) {
    if (unflattenedChildren[i]->tag == child->tag) {
      unflattenedChildren.erase(unflattenedChildren.begin() + i);
      break;
    }
  }

  auto &flattenedChildren = child->parent->children;
  for (int i = flattenedChildren.size() - 1; i >= 0; i--) {
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

// UIManagerAnimationDelegate

void LayoutAnimationsProxy_Legacy::uiManagerDidConfigureNextLayoutAnimation(
    jsi::Runtime &runtime,
    const RawValue &config,
    const jsi::Value &successCallbackValue,
    const jsi::Value &failureCallbackValue) const {}

void LayoutAnimationsProxy_Legacy::setComponentDescriptorRegistry(
    const SharedComponentDescriptorRegistry &componentDescriptorRegistry) {}

bool LayoutAnimationsProxy_Legacy::shouldAnimateFrame() const {
  return false;
}

void LayoutAnimationsProxy_Legacy::stopSurface(SurfaceId surfaceId) {
  surfacesToRemove_.insert(surfaceId);
}

} // namespace reanimated
