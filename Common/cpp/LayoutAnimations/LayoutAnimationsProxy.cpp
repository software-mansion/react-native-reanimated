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
  auto &runtime = nativeReanimatedModule_->getUIRuntime();

  if (layoutAnimation.opacity && !newStyle.hasProperty(runtime, "opacity")) {
    newStyle.setProperty(
        runtime, "opacity", jsi::Value(*layoutAnimation.opacity));
    layoutAnimation.opacity.reset();
  }

  auto rawProps =
      std::make_shared<RawProps>(runtime, jsi::Value(runtime, newStyle));

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
      tag, UpdateValues{newProps, Frame(runtime, newStyle)});

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

  if (layoutAnimation.count > 1) {
    layoutAnimation.count--;
    return {};
  }

  auto surfaceId = layoutAnimation.finalView->surfaceId;
  auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
  layoutAnimations_.erase(tag);
  updateMap.erase(tag);

  if (!shouldRemove || !nodeForTag.contains(tag)) {
    return {};
  }

  auto node = nodeForTag[tag];
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
      childrenForTag;

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
      // auto parentTag = mutation.parentTag; TODO: uncomment

      std::shared_ptr<MutationNode> mutationNode;
      std::shared_ptr<Node> node = nodeForTag[tag],
                            parent = nodeForTag[parentTag];

      if (!node) {
        mutationNode = std::make_shared<MutationNode>(mutation);
      } else {
        mutationNode =
            std::make_shared<MutationNode>(mutation, std::move(*node));
        for (auto subNode : mutationNode->children) {
          subNode->parent = mutationNode;
        }
      }
      if (!deletedViews.contains(mutation.oldChildShadowView.tag)) {
        mutationNode->state = MOVED;
        movedViews.insert_or_assign(
            mutation.oldChildShadowView.tag, mutation.oldChildShadowView);
      }
      nodeForTag[tag] = mutationNode;

      if (!parent) {
        parent = std::make_shared<Node>(parentTag);
        nodeForTag[parentTag] = parent;
      }

      if (!parent->parent) {
        roots.push_back(mutationNode);
      }

      childrenForTag[parentTag].push_back(mutationNode);
      mutationNode->parent = parent;
    }
    if (mutation.type == ShadowViewMutation::Update &&
        movedViews.contains(mutation.newChildShadowView.tag)) {
      auto node = nodeForTag[mutation.newChildShadowView.tag];
      auto mutationNode = std::static_pointer_cast<MutationNode>(node);
      mutationNode->mutation.oldChildShadowView = mutation.oldChildShadowView;
      movedViews[mutation.newChildShadowView.tag] = mutation.oldChildShadowView;
    }
  }

  for (auto &[parentTag, children] : childrenForTag) {
    nodeForTag[parentTag]->insertChildren(children);
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
      nodeForTag.erase(node->tag);
      node->parent->removeChild(node);
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
      maybeDropAncestors(node->parent, node, filteredMutations);
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
    if (mutation.parentShadowView.tag == surfaceId) {
      surfaceManager.updateWindow(
          surfaceId,
          mutation.parentShadowView.layoutMetrics.frame.size.width,
          mutation.parentShadowView.layoutMetrics.frame.size.height);
    }

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
        if (nodeForTag.contains(mutation.parentShadowView.tag)) {
          nodeForTag[mutation.parentShadowView.tag]->handleMutation(mutation);
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

        transferConfigFromNativeTag(
            mutation.newChildShadowView.props->nativeId,
            mutation.newChildShadowView.tag);
        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, ENTERING)) {
          filteredMutations.push_back(mutation);
          continue;
        }

        startEnteringAnimation(tag, mutation);
        filteredMutations.push_back(mutation);

        // temporarily set opacity to 0 to prevent flickering on android
        auto newView =
            std::make_shared<ShadowView>(mutation.newChildShadowView);
        folly::dynamic opacity = folly::dynamic::object("opacity", 0);
        auto newProps =
            getComponentDescriptorForShadowView(*newView).cloneProps(
                propsParserContext, newView->props, RawProps(opacity));
        newView->props = newProps;

        filteredMutations.push_back(ShadowViewMutation::UpdateMutation(
            mutation.newChildShadowView, *newView, mutation.parentShadowView));
        break;
      }

      case ShadowViewMutation::Type::Update: {
        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)) {
          // We should cancel any ongoing animation here to ensure that the
          // proper final state is reached for this view However, due to how
          // RNSScreens handle adding headers (a second commit is triggered to
          // offset all the elements by the header height) this would lead to
          // all entering animations being cancelled when a screen with a header
          // is pushed onto a stack
          // TODO: find a better solution for this problem
          filteredMutations.push_back(mutation);
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
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++) {
    auto &subNode = *it;
    if (subNode->state != DELETED) {
      endAnimationsRecursively(subNode, mutations);
    }
  }
  mutations.push_back(node->mutation);
  nodeForTag.erase(node->tag);
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
  parent->removeChild(child);
  if (parent->parent == nullptr) {
    return;
  }

  auto node = std::static_pointer_cast<MutationNode>(parent);
  node->animatedChildren.erase(child->tag);

  if (node->animatedChildren.empty() && node->state != ANIMATING) {
    nodeForTag.erase(node->tag);
    cleanupMutations.push_back(node->mutation);
    maybeCancelAnimation(node->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "delete " << node->tag << std::endl;
#endif
    cleanupMutations.push_back(
        ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
    maybeDropAncestors(node->parent, node, cleanupMutations);
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
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++) {
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
      nodeForTag.erase(subNode->tag);
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      maybeCancelAnimation(subNode->tag);
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
      subNode->state = DELETED;
      nodeForTag.erase(subNode->tag);
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
    node->removeChild(subNode);
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
  if (!nodeForTag.contains(mutation.parentShadowView.tag)) {
    return;
  }

  auto parent = nodeForTag[mutation.parentShadowView.tag];

  int size = 0, prevIndex = -1, offset = 0;

  for (auto subNode : parent->children) {
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
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    jsi::Object yogaValues(rt);
    yogaValues.setProperty(rt, "targetOriginX", values.x);
    yogaValues.setProperty(rt, "targetGlobalOriginX", values.x);
    yogaValues.setProperty(rt, "targetOriginY", values.y);
    yogaValues.setProperty(rt, "targetGlobalOriginY", values.y);
    yogaValues.setProperty(rt, "targetWidth", values.width);
    yogaValues.setProperty(rt, "targetHeight", values.height);
    yogaValues.setProperty(rt, "windowWidth", values.windowWidth);
    yogaValues.setProperty(rt, "windowHeight", values.windowHeight);
    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
        rt, tag, LayoutAnimationType::ENTERING, yogaValues);
  });
}

void LayoutAnimationsProxy::startExitingAnimation(
    const int tag,
    ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start exiting animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.oldChildShadowView.surfaceId;
  auto &oldView = mutation.oldChildShadowView;
  int count = 1;
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt != layoutAnimations_.end()) {
    auto &layoutAnimation = layoutAnimationIt->second;
    oldView = *layoutAnimation.currentView;
    count = layoutAnimation.count + 1;
  }

  auto finalView = std::make_shared<ShadowView>(mutation.oldChildShadowView);
  auto currentView = std::make_shared<ShadowView>(oldView);
  auto parentView = std::make_shared<ShadowView>(mutation.parentShadowView);
  layoutAnimations_.insert_or_assign(
      tag, LayoutAnimation{finalView, currentView, parentView, {}, count});

  Snapshot values(oldView, surfaceManager.getWindow(surfaceId));

  uiScheduler_->scheduleOnUI([values, this, tag]() {
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    jsi::Object yogaValues(rt);
    yogaValues.setProperty(rt, "currentOriginX", values.x);
    yogaValues.setProperty(rt, "currentGlobalOriginX", values.x);
    yogaValues.setProperty(rt, "currentOriginY", values.y);
    yogaValues.setProperty(rt, "currentGlobalOriginY", values.y);
    yogaValues.setProperty(rt, "currentWidth", values.width);
    yogaValues.setProperty(rt, "currentHeight", values.height);
    yogaValues.setProperty(rt, "windowWidth", values.windowWidth);
    yogaValues.setProperty(rt, "windowHeight", values.windowHeight);
    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
        rt, tag, LayoutAnimationType::EXITING, yogaValues);
    layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
  });
}

void LayoutAnimationsProxy::startLayoutAnimation(
    const int tag,
    const ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start layout animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.newChildShadowView.surfaceId;
  auto oldView = mutation.oldChildShadowView;
  int count = 1;
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt != layoutAnimations_.end()) {
    auto &layoutAnimation = layoutAnimationIt->second;
    oldView = *layoutAnimation.currentView;
    count = layoutAnimation.count + 1;
  }

  auto finalView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  auto currentView = std::make_shared<ShadowView>(oldView);
  auto parentView = std::make_shared<ShadowView>(mutation.parentShadowView);
  layoutAnimations_.insert_or_assign(
      tag, LayoutAnimation{finalView, currentView, parentView, {}, count});

  Snapshot currentValues(oldView, surfaceManager.getWindow(surfaceId));
  Snapshot targetValues(
      mutation.newChildShadowView, surfaceManager.getWindow(surfaceId));

  uiScheduler_->scheduleOnUI([currentValues, targetValues, this, tag]() {
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    jsi::Object yogaValues(rt);
    yogaValues.setProperty(rt, "currentOriginX", currentValues.x);
    yogaValues.setProperty(rt, "currentGlobalOriginX", currentValues.x);
    yogaValues.setProperty(rt, "currentOriginY", currentValues.y);
    yogaValues.setProperty(rt, "currentGlobalOriginY", currentValues.y);
    yogaValues.setProperty(rt, "currentWidth", currentValues.width);
    yogaValues.setProperty(rt, "currentHeight", currentValues.height);
    yogaValues.setProperty(rt, "targetOriginX", targetValues.x);
    yogaValues.setProperty(rt, "targetGlobalOriginX", targetValues.x);
    yogaValues.setProperty(rt, "targetOriginY", targetValues.y);
    yogaValues.setProperty(rt, "targetGlobalOriginY", targetValues.y);
    yogaValues.setProperty(rt, "targetWidth", targetValues.width);
    yogaValues.setProperty(rt, "targetHeight", targetValues.height);
    yogaValues.setProperty(rt, "windowWidth", targetValues.windowWidth);
    yogaValues.setProperty(rt, "windowHeight", targetValues.windowHeight);
    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
        rt, tag, LayoutAnimationType::LAYOUT, yogaValues);
  });
}

void LayoutAnimationsProxy::maybeCancelAnimation(const int tag) const {
  if (!layoutAnimations_.contains(tag)) {
    return;
  }
  layoutAnimations_.erase(tag);
  uiScheduler_->scheduleOnUI([this, tag]() {
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    nativeReanimatedModule_->layoutAnimationsManager().cancelLayoutAnimation(
        rt, tag);
  });
}

void LayoutAnimationsProxy::transferConfigFromNativeTag(
    const std::string nativeIdString,
    const int tag) const {
  if (nativeIdString.empty()) {
    return;
  }
  try {
    auto nativeId = stoi(nativeIdString);
    layoutAnimationsManager_->transferConfigFromNativeTag(nativeId, tag);
  } catch (std::invalid_argument) {
  }
}

void Node::handleMutation(ShadowViewMutation mutation) {
  if (tag != mutation.parentShadowView.tag) {
    return;
  }

  int delta = mutation.type == ShadowViewMutation::Insert ? 1 : -1;
  for (int i = children.size() - 1; i >= 0; i--) {
    if (children[i]->mutation.index < mutation.index) {
      return;
    }
    children[i]->mutation.index += delta;
  }
}

void Node::removeChild(std::shared_ptr<MutationNode> child) {
  for (int i = children.size() - 1; i >= 0; i--) {
    if (children[i]->tag == child->tag) {
      children.erase(children.begin() + i);
      return;
    }
    children[i]->mutation.index--;
  }
}

void Node::insertChildren(
    std::vector<std::shared_ptr<MutationNode>> &newChildren) {
  std::vector<std::shared_ptr<MutationNode>> mergedChildren;
  auto it1 = children.begin(), it2 = newChildren.begin();
  while (it1 != children.end() && it2 != newChildren.end()) {
    if ((*it1)->mutation.index < (*it2)->mutation.index) {
      mergedChildren.push_back(*it1);
      it1++;
    } else {
      mergedChildren.push_back(*it2);
      it2++;
    }
  }
  while (it1 != children.end()) {
    mergedChildren.push_back(*it1);
    it1++;
  }
  while (it2 != newChildren.end()) {
    mergedChildren.push_back(*it2);
    it2++;
  }
  std::swap(children, mergedChildren);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
