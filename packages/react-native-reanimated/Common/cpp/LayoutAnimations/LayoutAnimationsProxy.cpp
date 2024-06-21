#ifdef RCT_NEW_ARCH_ENABLED

#include "LayoutAnimationsProxy.h"
#include <react/renderer/animations/utils.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <set>
#include <utility>
#include "NativeReanimatedModule.h"

namespace reanimated {

// We never modify the Shadow Tree, we just send some additional
// mutations to the mounting layer.
// When animations finish, the Host Tree will represent the most recent Shadow
// Tree
// On android this code will be sometimes executed on the JS thread.
// That's why we have to schedule some of animation manager function on the UI
// thread
std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "\npullTransaction " << std::this_thread::get_id() << " "
            << surfaceId << std::endl;
#endif
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  ShadowViewMutationList filteredMutations;

  std::vector<std::shared_ptr<MutationNode>> roots;
  std::unordered_map<Tag, ShadowView> movedViews;

  parseRemoveMutations(movedViews, mutations, roots);

  handleRemovals(filteredMutations, roots);

  handleUpdatesAndEnterings(
      filteredMutations, movedViews, mutations, propsParserContext, surfaceId);

  addOngoingAnimations(surfaceId, filteredMutations);

  return MountingTransaction{
      surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

std::optional<SurfaceId> LayoutAnimationsProxy::progressLayoutAnimation(
    int tag,
    const jsi::Object &newStyle) {
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

  auto rawProps =
      std::make_shared<RawProps>(uiRuntime_, jsi::Value(uiRuntime_, newStyle));

  PropsParserContext propsParserContext{
      layoutAnimation.finalView->surfaceId, *contextContainer_};
#ifdef ANDROID
  rawProps = std::make_shared<RawProps>(folly::dynamic::merge(
      layoutAnimation.finalView->props->rawProps, (folly::dynamic)*rawProps));
#endif
  auto newProps =
      getComponentDescriptorForShadowView(*layoutAnimation.finalView)
          .cloneProps(
              propsParserContext,
              layoutAnimation.finalView->props,
              std::move(*rawProps));
  auto &updateMap =
      surfaceManager.getUpdateMap(layoutAnimation.finalView->surfaceId);
  updateMap.insert_or_assign(
      tag, UpdateValues{newProps, Frame(uiRuntime_, newStyle)});

  return layoutAnimation.finalView->surfaceId;
}

std::optional<SurfaceId> LayoutAnimationsProxy::endLayoutAnimation(
    int tag,
    bool shouldRemove) {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "end layout animation for " << tag << " - should remove "
            << shouldRemove << std::endl;
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

  auto surfaceId = layoutAnimation.finalView->surfaceId;
  auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
  layoutAnimations_.erase(tag);
  updateMap.erase(tag);

  if (!shouldRemove || !nodeForTag_.contains(tag)) {
    return {};
  }

  auto node = nodeForTag_[tag];
  auto mutationNode = std::static_pointer_cast<MutationNode>(node);
  mutationNode->state = DEAD;
  deadNodes.insert(mutationNode);

  return surfaceId;
}

/**
 Organizes removed views into a tree structure, allowing for convenient
 traversals and index maintenance
 */
void LayoutAnimationsProxy::parseRemoveMutations(
    std::unordered_map<Tag, ShadowView> &movedViews,
    ShadowViewMutationList &mutations,
    std::vector<std::shared_ptr<MutationNode>> &roots) const {
  std::set<Tag> deletedViews;
  std::unordered_map<Tag, std::vector<std::shared_ptr<MutationNode>>>
      childrenForTag, unflattenedChildrenForTag;

  // iterate from the end, so that parents appear before children
  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    auto &mutation = *it;
    if (mutation.type == ShadowViewMutation::Delete) {
      deletedViews.insert(mutation.oldChildShadowView.tag);
    }
    if (mutation.type == ShadowViewMutation::Remove) {
      updateIndexForMutation(mutation);
      auto tag = mutation.oldChildShadowView.tag;
      auto parentTag = mutation.parentShadowView.tag;
      auto unflattenedParentTag = parentTag; // temporary

      std::shared_ptr<MutationNode> mutationNode;
      std::shared_ptr<Node> node = nodeForTag_[tag],
                            parent = nodeForTag_[parentTag],
                            unflattenedParent =
                                nodeForTag_[unflattenedParentTag];

      if (!node) {
        mutationNode = std::make_shared<MutationNode>(mutation);
      } else {
        mutationNode =
            std::make_shared<MutationNode>(mutation, std::move(*node));
        for (auto &subNode : mutationNode->children) {
          subNode->parent = mutationNode;
        }
        for (auto &subNode : mutationNode->unflattenedChildren) {
          subNode->unflattenedParent = mutationNode;
        }
      }
      if (!deletedViews.contains(mutation.oldChildShadowView.tag)) {
        mutationNode->state = MOVED;
        movedViews.insert_or_assign(
            mutation.oldChildShadowView.tag, mutation.oldChildShadowView);
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

      if (!unflattenedParent->parent) {
        roots.push_back(mutationNode);
      }

      childrenForTag[parentTag].push_back(mutationNode);
      unflattenedChildrenForTag[unflattenedParentTag].push_back(mutationNode);
      mutationNode->parent = parent;
      mutationNode->unflattenedParent = unflattenedParent;
    }
    if (mutation.type == ShadowViewMutation::Update &&
        movedViews.contains(mutation.newChildShadowView.tag)) {
      auto node = nodeForTag_[mutation.newChildShadowView.tag];
      auto mutationNode = std::static_pointer_cast<MutationNode>(node);
      mutationNode->mutation.oldChildShadowView = mutation.oldChildShadowView;
      movedViews[mutation.newChildShadowView.tag] = mutation.oldChildShadowView;
    }
  }

  for (auto &[parentTag, children] : childrenForTag) {
    nodeForTag_[parentTag]->insertChildren(children);
  }
  for (auto &[unflattenedParentTag, children] : unflattenedChildrenForTag) {
    nodeForTag_[unflattenedParentTag]->insertUnflattenedChildren(children);
  }
}

void LayoutAnimationsProxy::handleRemovals(
    ShadowViewMutationList &filteredMutations,
    std::vector<std::shared_ptr<MutationNode>> &roots) const {
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = roots.rbegin(); it != roots.rend(); it++) {
    auto &node = *it;
    if (!startAnimationsRecursively(
            node, true, true, false, filteredMutations)) {
      filteredMutations.push_back(node->mutation);
      nodeForTag_.erase(node->tag);
      node->unflattenedParent->removeChildFromUnflattenedTree(node); //???
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "delete " << node->tag << std::endl;
#endif
      if (node->state != MOVED) {
        maybeCancelAnimation(node->tag);
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(
            node->mutation.oldChildShadowView));
      }
    }
  }

  for (auto node : deadNodes) {
    if (node->state != DELETED) {
      endAnimationsRecursively(node, filteredMutations);
      maybeDropAncestors(node->unflattenedParent, node, filteredMutations);
    }
  }
  deadNodes.clear();
}

void LayoutAnimationsProxy::handleUpdatesAndEnterings(
    ShadowViewMutationList &filteredMutations,
    const std::unordered_map<Tag, ShadowView> &movedViews,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  for (auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation, surfaceId);

    Tag tag = mutation.type == ShadowViewMutation::Type::Create ||
            mutation.type == ShadowViewMutation::Type::Insert
        ? mutation.newChildShadowView.tag
        : mutation.oldChildShadowView.tag;

    switch (mutation.type) {
      case ShadowViewMutation::Type::Create: {
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Type::Insert: {
        updateIndexForMutation(mutation);
        if (nodeForTag_.contains(mutation.parentShadowView.tag)) {
          nodeForTag_[mutation.parentShadowView.tag]->applyMutationToIndices(
              mutation);
        }

        if (movedViews.contains(tag)) {
          auto layoutAnimationIt = layoutAnimations_.find(tag);
          if (layoutAnimationIt == layoutAnimations_.end()) {
            filteredMutations.push_back(mutation);
            continue;
          }

          auto oldView = *layoutAnimationIt->second.currentView;
          filteredMutations.push_back(ShadowViewMutation::InsertMutation(
              mutation.parentShadowView, oldView, mutation.index));
          continue;
        }

        transferConfigFromNativeID(
            mutation.newChildShadowView.props->nativeId,
            mutation.newChildShadowView.tag);
        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, ENTERING)) {
          filteredMutations.push_back(mutation);
          continue;
        }

        startEnteringAnimation(tag, mutation);
        filteredMutations.push_back(mutation);

        // temporarily set opacity to 0 to prevent flickering on android
        std::shared_ptr<ShadowView> newView =
            cloneViewWithoutOpacity(mutation, propsParserContext);

        filteredMutations.push_back(ShadowViewMutation::UpdateMutation(
            mutation.newChildShadowView, *newView, mutation.parentShadowView));
        break;
      }

      case ShadowViewMutation::Type::Update: {
        auto shouldAnimate = hasLayoutChanged(mutation);
        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT) ||
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
        startLayoutAnimation(tag, mutation);
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

void LayoutAnimationsProxy::addOngoingAnimations(
    SurfaceId surfaceId,
    ShadowViewMutationList &mutations) const {
  auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
  for (auto &[tag, updateValues] : updateMap) {
    auto layoutAnimationIt = layoutAnimations_.find(tag);

    if (layoutAnimationIt == layoutAnimations_.end()) {
      continue;
    }

    auto &layoutAnimation = layoutAnimationIt->second;

    auto newView = std::make_shared<ShadowView>(*layoutAnimation.finalView);
    newView->props = updateValues.newProps;
    updateLayoutMetrics(newView->layoutMetrics, updateValues.frame);

    mutations.push_back(ShadowViewMutation::UpdateMutation(
        *layoutAnimation.currentView, *newView, *layoutAnimation.parentView));
    layoutAnimation.currentView = newView;
  }
  updateMap.clear();
}

void LayoutAnimationsProxy::endAnimationsRecursively(
    std::shared_ptr<MutationNode> node,
    ShadowViewMutationList &mutations) const {
  maybeCancelAnimation(node->tag);
  node->state = DELETED;
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = node->unflattenedChildren.rbegin();
       it != node->unflattenedChildren.rend();
       it++) {
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
  mutations.push_back(
      ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
}

void LayoutAnimationsProxy::maybeDropAncestors(
    std::shared_ptr<Node> parent,
    std::shared_ptr<MutationNode> child,
    ShadowViewMutationList &cleanupMutations) const {
  parent->removeChildFromUnflattenedTree(child);
  if (!parent->isMutationMode()) {
    return;
  }

  auto node = std::static_pointer_cast<MutationNode>(parent);
  node->animatedChildren.erase(child->tag);

  if (node->animatedChildren.empty() && node->state != ANIMATING) {
    nodeForTag_.erase(node->tag);
    cleanupMutations.push_back(node->mutation);
    maybeCancelAnimation(node->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "delete " << node->tag << std::endl;
#endif
    cleanupMutations.push_back(
        ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
    maybeDropAncestors(node->unflattenedParent, node, cleanupMutations);
  }
}

const ComponentDescriptor &
LayoutAnimationsProxy::getComponentDescriptorForShadowView(
    const ShadowView &shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
}

bool LayoutAnimationsProxy::startAnimationsRecursively(
    std::shared_ptr<MutationNode> node,
    bool shouldRemoveSubviewsWithoutAnimations,
    bool shouldAnimate,
    bool isScreenPop,
    ShadowViewMutationList &mutations) const {
  if (isRNSScreen(node)) {
    isScreenPop = true;
  }

  shouldAnimate = !isScreenPop &&
      layoutAnimationsManager_->shouldAnimateExiting(node->tag, shouldAnimate);

  bool hasExitAnimation = shouldAnimate &&
      layoutAnimationsManager_->hasLayoutAnimation(
          node->tag, LayoutAnimationType::EXITING);
  bool hasAnimatedChildren = false;

  shouldRemoveSubviewsWithoutAnimations =
      shouldRemoveSubviewsWithoutAnimations && !hasExitAnimation;
  std::vector<std::shared_ptr<MutationNode>> toBeRemoved;

  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = node->unflattenedChildren.rbegin();
       it != node->unflattenedChildren.rend();
       it++) {
    auto &subNode = *it;
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "child " << subNode->tag << " "
              << " " << shouldAnimate << " "
              << shouldRemoveSubviewsWithoutAnimations << std::endl;
#endif
    if (subNode->state != UNDEFINED && subNode->state != MOVED) {
      if (shouldAnimate && subNode->state != DEAD) {
        node->animatedChildren.insert(subNode->tag);
        hasAnimatedChildren = true;
      } else {
        endAnimationsRecursively(subNode, mutations);
      }
    } else if (startAnimationsRecursively(
                   subNode,
                   shouldRemoveSubviewsWithoutAnimations,
                   shouldAnimate,
                   isScreenPop,
                   mutations)) {
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "child " << subNode->tag
                << " start animations returned true " << std::endl;
#endif
      node->animatedChildren.insert(subNode->tag);
      hasAnimatedChildren = true;
    } else if (subNode->state == MOVED) {
      mutations.push_back(subNode->mutation);
      nodeForTag_.erase(subNode->tag);
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      maybeCancelAnimation(subNode->tag);
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
      subNode->state = DELETED;
      nodeForTag_.erase(subNode->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "delete " << subNode->tag << std::endl;
#endif
      mutations.push_back(ShadowViewMutation::DeleteMutation(
          subNode->mutation.oldChildShadowView));
    } else {
      subNode->state = WAITING;
    }
  }

  for (auto &subNode : toBeRemoved) {
    node->removeChildFromUnflattenedTree(subNode);
  }

  if (node->state == MOVED) {
    return false;
  }

  bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->state = ANIMATING;
    startExitingAnimation(node->tag, node->mutation);
  } else {
    layoutAnimationsManager_->clearLayoutAnimationConfig(node->tag);
  }

  if (!wantAnimateExit) {
    return false;
  }

  return true;
}

void LayoutAnimationsProxy::updateIndexForMutation(
    ShadowViewMutation &mutation) const {
  if (mutation.index == -1) {
    return;
  }
  if (!nodeForTag_.contains(mutation.parentShadowView.tag)) {
    return;
  }

  auto parent = nodeForTag_[mutation.parentShadowView.tag];

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
  int tag = mutation.type == ShadowViewMutation::Insert
      ? mutation.newChildShadowView.tag
      : mutation.oldChildShadowView.tag;
  LOG(INFO) << "update index for " << tag << " in "
            << mutation.parentShadowView.tag << ": " << mutation.index << " -> "
            << mutation.index + offset << std::endl;
#endif
  mutation.index += offset;
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  return true;
}

void LayoutAnimationsProxy::createLayoutAnimation(
    const ShadowViewMutation &mutation,
    ShadowView &oldView,
    const SurfaceId &surfaceId,
    const int tag) const {
  int count = 1;
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt != layoutAnimations_.end()) {
    auto &layoutAnimation = layoutAnimationIt->second;
    oldView = *layoutAnimation.currentView;
    count = layoutAnimation.count + 1;
  }

  auto finalView = std::make_shared<ShadowView>(
      mutation.type == ShadowViewMutation::Remove
          ? mutation.oldChildShadowView
          : mutation.newChildShadowView);
  auto currentView = std::make_shared<ShadowView>(oldView);
  auto parentView = std::make_shared<ShadowView>(mutation.parentShadowView);
  layoutAnimations_.insert_or_assign(
      tag, LayoutAnimation{finalView, currentView, parentView, {}, count});
}

void LayoutAnimationsProxy::startEnteringAnimation(
    const int tag,
    ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start entering animation for tag " << tag << std::endl;
#endif
  auto finalView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  auto current = std::make_shared<ShadowView>(mutation.oldChildShadowView);
  auto parent = std::make_shared<ShadowView>(mutation.parentShadowView);

  auto &viewProps =
      static_cast<const ViewProps &>(*mutation.newChildShadowView.props);
  layoutAnimations_.insert_or_assign(
      tag, LayoutAnimation{finalView, current, parent, viewProps.opacity});

  Snapshot values(
      mutation.newChildShadowView,
      surfaceManager.getWindow(mutation.newChildShadowView.surfaceId));
  uiScheduler_->scheduleOnUI([values, this, tag]() {
    jsi::Object yogaValues(uiRuntime_);
    yogaValues.setProperty(uiRuntime_, "targetOriginX", values.x);
    yogaValues.setProperty(uiRuntime_, "targetGlobalOriginX", values.x);
    yogaValues.setProperty(uiRuntime_, "targetOriginY", values.y);
    yogaValues.setProperty(uiRuntime_, "targetGlobalOriginY", values.y);
    yogaValues.setProperty(uiRuntime_, "targetWidth", values.width);
    yogaValues.setProperty(uiRuntime_, "targetHeight", values.height);
    yogaValues.setProperty(uiRuntime_, "windowWidth", values.windowWidth);
    yogaValues.setProperty(uiRuntime_, "windowHeight", values.windowHeight);
    layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime_, tag, LayoutAnimationType::ENTERING, yogaValues);
  });
}

void LayoutAnimationsProxy::startExitingAnimation(
    const int tag,
    ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start exiting animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.oldChildShadowView.surfaceId;
  auto oldView = mutation.oldChildShadowView;
  createLayoutAnimation(mutation, oldView, surfaceId, tag);

  Snapshot values(oldView, surfaceManager.getWindow(surfaceId));

  uiScheduler_->scheduleOnUI([values, this, tag]() {
    jsi::Object yogaValues(uiRuntime_);
    yogaValues.setProperty(uiRuntime_, "currentOriginX", values.x);
    yogaValues.setProperty(uiRuntime_, "currentGlobalOriginX", values.x);
    yogaValues.setProperty(uiRuntime_, "currentOriginY", values.y);
    yogaValues.setProperty(uiRuntime_, "currentGlobalOriginY", values.y);
    yogaValues.setProperty(uiRuntime_, "currentWidth", values.width);
    yogaValues.setProperty(uiRuntime_, "currentHeight", values.height);
    yogaValues.setProperty(uiRuntime_, "windowWidth", values.windowWidth);
    yogaValues.setProperty(uiRuntime_, "windowHeight", values.windowHeight);
    layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime_, tag, LayoutAnimationType::EXITING, yogaValues);
    layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
  });
}

void LayoutAnimationsProxy::startLayoutAnimation(
    const int tag,
    const ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start layout animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.oldChildShadowView.surfaceId;
  auto oldView = mutation.oldChildShadowView;
  createLayoutAnimation(mutation, oldView, surfaceId, tag);

  Snapshot currentValues(oldView, surfaceManager.getWindow(surfaceId));
  Snapshot targetValues(
      mutation.newChildShadowView, surfaceManager.getWindow(surfaceId));

  uiScheduler_->scheduleOnUI([currentValues, targetValues, this, tag]() {
    jsi::Object yogaValues(uiRuntime_);
    yogaValues.setProperty(uiRuntime_, "currentOriginX", currentValues.x);
    yogaValues.setProperty(uiRuntime_, "currentGlobalOriginX", currentValues.x);
    yogaValues.setProperty(uiRuntime_, "currentOriginY", currentValues.y);
    yogaValues.setProperty(uiRuntime_, "currentGlobalOriginY", currentValues.y);
    yogaValues.setProperty(uiRuntime_, "currentWidth", currentValues.width);
    yogaValues.setProperty(uiRuntime_, "currentHeight", currentValues.height);
    yogaValues.setProperty(uiRuntime_, "targetOriginX", targetValues.x);
    yogaValues.setProperty(uiRuntime_, "targetGlobalOriginX", targetValues.x);
    yogaValues.setProperty(uiRuntime_, "targetOriginY", targetValues.y);
    yogaValues.setProperty(uiRuntime_, "targetGlobalOriginY", targetValues.y);
    yogaValues.setProperty(uiRuntime_, "targetWidth", targetValues.width);
    yogaValues.setProperty(uiRuntime_, "targetHeight", targetValues.height);
    yogaValues.setProperty(uiRuntime_, "windowWidth", targetValues.windowWidth);
    yogaValues.setProperty(
        uiRuntime_, "windowHeight", targetValues.windowHeight);
    layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime_, tag, LayoutAnimationType::LAYOUT, yogaValues);
  });
}

void LayoutAnimationsProxy::updateOngoingAnimationTarget(
    const int tag,
    const ShadowViewMutation &mutation) const {
  layoutAnimations_[tag].finalView =
      std::make_shared<ShadowView>(mutation.newChildShadowView);
}

void LayoutAnimationsProxy::maybeCancelAnimation(const int tag) const {
  if (!layoutAnimations_.contains(tag)) {
    return;
  }
  layoutAnimations_.erase(tag);
  uiScheduler_->scheduleOnUI([this, tag]() {
    layoutAnimationsManager_->cancelLayoutAnimation(uiRuntime_, tag);
  });
}

void LayoutAnimationsProxy::transferConfigFromNativeID(
    const std::string nativeIdString,
    const int tag) const {
  if (nativeIdString.empty()) {
    return;
  }
  try {
    auto nativeId = stoi(nativeIdString);
    layoutAnimationsManager_->transferConfigFromNativeID(nativeId, tag);
  } catch (std::invalid_argument) {
  }
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
std::shared_ptr<ShadowView> LayoutAnimationsProxy::cloneViewWithoutOpacity(
    facebook::react::ShadowViewMutation &mutation,
    const PropsParserContext &propsParserContext) const {
  auto newView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps = getComponentDescriptorForShadowView(*newView).cloneProps(
      propsParserContext, newView->props, RawProps(opacity));
  newView->props = newProps;
  return newView;
}

void LayoutAnimationsProxy::maybeRestoreOpacity(
    LayoutAnimation &layoutAnimation,
    const jsi::Object &newStyle) const {
  if (layoutAnimation.opacity && !newStyle.hasProperty(uiRuntime_, "opacity")) {
    newStyle.setProperty(
        uiRuntime_, "opacity", jsi::Value(*layoutAnimation.opacity));
    layoutAnimation.opacity.reset();
  }
}

void LayoutAnimationsProxy::maybeUpdateWindowDimensions(
    facebook::react::ShadowViewMutation &mutation,
    SurfaceId surfaceId) const {
  // This is a hacky way to obtain the window dimensions.
  // We can identify the root, by checking if its tag is equal to the surfaceId
  if (mutation.parentShadowView.tag == surfaceId) {
    surfaceManager.updateWindow(
        surfaceId,
        mutation.parentShadowView.layoutMetrics.frame.size.width,
        mutation.parentShadowView.layoutMetrics.frame.size.height);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
