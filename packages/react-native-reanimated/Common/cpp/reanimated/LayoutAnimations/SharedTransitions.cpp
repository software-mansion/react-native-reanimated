#include <folly/dynamic.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <algorithm>
#include <ranges>

namespace reanimated {

// MARK: Shared Element Transitions

// A boundary is active when its `isActive` prop (controlled from JS,
// e.g. with `useIsFocused`) is true and it's not currently exiting.
std::shared_ptr<LightNode> LayoutAnimationsProxy_Experimental::findActiveBoundary(
    const std::shared_ptr<LightNode> &node) const {
  std::shared_ptr<LightNode> result = nullptr;

  if (node->isExiting()) {
    return result;
  }
  if (isSETBoundary(node) && isBoundaryActive(node)) {
    return node;
  }
  for (const auto &child : std::views::reverse(node->children)) {
    auto top = findActiveBoundary(child);
    if (top) {
      return top;
    }
  }

  return result;
}

std::shared_ptr<LightNode> LayoutAnimationsProxy_Experimental::findBoundaryGuess(
    const std::shared_ptr<LightNode> &node) const {
  std::shared_ptr<LightNode> result = nullptr;

  if (node->isExiting()) {
    return result;
  }
  if (isSETBoundary(node)) {
    result = node;
  }
  for (const auto &child : std::views::reverse(node->children)) {
    auto top = findBoundaryGuess(child);
    if (top) {
      return top;
    }
  }

  return result;
}

void LayoutAnimationsProxy_Experimental::findSharedElementsOnScreen(
    const std::shared_ptr<LightNode> &node,
    BeforeOrAfter index,
    const PropsParserContext &propsParserContext,
    TransactionMeta &transaction) const {
  if (node->isExiting()) {
    return;
  }
  std::optional<SharedTag> sharedTag;
  {
    auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
    const auto it = sharedTransitionManager_->tagToName_.find(node->current.tag);
    if (it != sharedTransitionManager_->tagToName_.end()) {
      sharedTag = it->second;
    }
  }
  if (sharedTag) {
    ShadowView copy = node->current;
    std::vector<react::Point> absolutePositions;
    absolutePositions = getAbsolutePositionsForRootPathView(node);
    copy.layoutMetrics.frame.origin = absolutePositions[0];

    auto &collectedTransition = transaction.transitionMap[*sharedTag];
    auto &transition = collectedTransition.transition;
    auto &[snapshot, parentTag, transform] = transition;
    auto newTransform = parseParentTransforms(node, absolutePositions);
    const auto &parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");

    int indexNum = static_cast<int>(index);
    transform[indexNum] = std::move(newTransform);
    snapshot[indexNum] = copy;
    parentTag[indexNum] = parent->current.tag;
    collectedTransition.nodes[indexNum] = node;

    if (parentTag[BEFORE] && parentTag[AFTER]) {
      transaction.transitions.emplace_back(*sharedTag, collectedTransition);
    } else if (parentTag[AFTER]) {
      // TODO (future): this is adding unnecessary views to the list
      transaction.nodesToRestore.push_back(node);
    }
  }
  for (auto &child : node->children) {
    findSharedElementsOnScreen(child, index, propsParserContext, transaction);
  }
}

void LayoutAnimationsProxy_Experimental::handleProgressTransition(
    TransactionMeta &transaction,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  auto &filteredMutations = transaction.filteredMutations;
  if (!transitionUpdated_) {
    return;
  }
  transitionUpdated_ = false;

  if (!mutations.empty() || !static_cast<bool>(transitionState_)) {
    return;
  }

  if (transitionState_ == TransitionState::START) {
    auto beforeTopScreen = topScreen_;
    auto afterTopScreen = findBoundaryGuess(lightNodes_[transitionTag_]);
    if (beforeTopScreen && afterTopScreen && beforeTopScreen != afterTopScreen) {
      findSharedElementsOnScreen(beforeTopScreen, BEFORE, propsParserContext, transaction);
      findSharedElementsOnScreen(afterTopScreen, AFTER, propsParserContext, transaction);
      hideTransitioningViews(BEFORE, filteredMutations, transaction, propsParserContext);
      hideTransitioningViews(AFTER, filteredMutations, transaction, propsParserContext);

      for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
        auto &transition = collectedTransition.transition;
        auto &[before, after] = transition.snapshot;
        const auto &transform = transition.transform;
        overrideTransform(before, transform[BEFORE], propsParserContext);
        overrideTransform(after, transform[AFTER], propsParserContext);
        const auto &[beforeNode, afterNode] = collectedTransition.nodes;
        react_native_assert(beforeNode && "Shared transition source not found");
        react_native_assert(afterNode && "Shared transition target not found");
        if (!beforeNode || !afterNode) {
          continue;
        }

        const auto containerTag = getOrCreateContainer(before, sharedTag, transaction);
        auto &container = sharedContainers_.at(containerTag);
        container.restoreBeforeNode = beforeNode;
        if (container.restoreAfterNode && container.restoreAfterNode != afterNode) {
          transaction.nodesToRestore.push_back(container.restoreAfterNode);
        }
        container.restoreAfterNode = afterNode;
        before.tag = containerTag;
        after.tag = containerTag;

        startProgressTransition(containerTag, before, after);
      }
    }
  } else if (transitionState_ == TransitionState::ACTIVE) {
    for (const auto &[tag, container] : sharedContainers_) {
      if (!container.restoreBeforeNode) {
        continue;
      }
      if (hasPendingLayoutAnimation(tag)) {
        continue;
      }
      const auto layoutAnimationIt = layoutAnimations_.find(tag);
      if (layoutAnimationIt == layoutAnimations_.end()) {
        react_native_assert(false && "Shared transition animation not found");
        continue;
      }
      const auto &layoutAnimation = layoutAnimationIt->second;
      auto before = layoutAnimation.startView.layoutMetrics.frame;
      auto after = layoutAnimation.finalView.layoutMetrics.frame;
      auto x = before.origin.x + transitionProgress_ * (after.origin.x - before.origin.x);
      auto y = before.origin.y + transitionProgress_ * (after.origin.y - before.origin.y);
      auto width = before.size.width + transitionProgress_ * (after.size.width - before.size.width);
      auto height = before.size.height + transitionProgress_ * (after.size.height - before.size.height);

      auto beforeProps = std::static_pointer_cast<const BaseViewProps>(layoutAnimation.startView.props);
      auto afterProps = std::static_pointer_cast<const BaseViewProps>(layoutAnimation.finalView.props);
      auto beforeRadius = beforeProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point)).value;
      auto afterRadius = afterProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point)).value;

      // TODO (future): Support more props in progress transitions.
      auto borderRadiusDynamic =
          folly::dynamic::object("borderRadius", beforeRadius + transitionProgress_ * (afterRadius - beforeRadius));

#ifdef RN_SERIALIZABLE_STATE
      // TODO (future): Support borderRadius on Android.
      const Props::Shared newProps = nullptr;
#else
      auto rawProps = RawProps(std::move(borderRadiusDynamic));

      auto newProps = getComponentDescriptorForShadowView(layoutAnimation.finalView)
                          .cloneProps(propsParserContext, layoutAnimation.finalView.props, std::move(rawProps));
#endif

      updateMap_.insert_or_assign(tag, UpdateValues{newProps, {x, y, width, height}});
    }
  }

  if (transitionState_ == TransitionState::START) {
    transitionState_ = TransitionState::ACTIVE;
  } else if (transitionState_ == TransitionState::END || transitionState_ == TransitionState::CANCELLED) {
    std::vector<Tag> progressContainerTags;
    for (const auto &[tag, container] : sharedContainers_) {
      if (container.restoreBeforeNode) {
        progressContainerTags.push_back(tag);
      }
    }
    for (const auto tag : progressContainerTags) {
      const auto &container = sharedContainers_.at(tag);
      react_native_assert(container.restoreAfterNode && "Shared transition target not found");
      if (container.restoreAfterNode) {
        transaction.nodesToRestore.push_back(container.restoreAfterNode);
      }
      if (transitionState_ == TransitionState::CANCELLED) {
        transaction.nodesToRestore.push_back(container.restoreBeforeNode);
      }
      removeSharedContainer(tag, transaction);
      maybeCancelAnimation(tag);
    }
    if (transitionState_ == TransitionState::END) {
      synchronized_ = false;
    }
    transitionState_ = TransitionState::NONE;
  }
}

void LayoutAnimationsProxy_Experimental::overrideTransform(
    ShadowView &shadowView,
    const std::optional<Transform> &transform,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s("overrideTransfrom");
  if (!transform) {
    return;
  }
#ifdef ANDROID
  auto array = folly::dynamic::array(folly::dynamic::object("matrix", transform->operator folly::dynamic()));
  const folly::dynamic newTransformDynamic = folly::dynamic::object("transform", array);
  auto newRawProps = folly::dynamic::merge(shadowView.props->rawProps, newTransformDynamic);
  auto newProps = getComponentDescriptorForShadowView(shadowView)
                      .cloneProps(propsParserContext, shadowView.props, RawProps(newRawProps));
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
#else
  auto newProps = getComponentDescriptorForShadowView(shadowView).cloneProps(propsParserContext, shadowView.props, {});
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
  viewProps->transform = *transform;
#endif
  shadowView.props = newProps;
}

Tag LayoutAnimationsProxy_Experimental::getOrCreateContainer(
    const ShadowView &before,
    const SharedTag &sharedTag,
    TransactionMeta &transaction) const {
  auto containerTag = Tag{-1};
  for (const auto &[tag, container] : sharedContainers_) {
    if (container.sharedTag == sharedTag && tag > containerTag) {
      containerTag = tag;
    }
  }
  if (containerTag != -1) {
    if (hasPendingLayoutAnimation(containerTag) || layoutAnimations_.contains(containerTag)) {
      return containerTag;
    }
    const auto &container = sharedContainers_.at(containerTag);
    react_native_assert(completedAnimations_.contains(containerTag) && "Shared container has no animation");
    if (container.restoreAfterNode) {
      transaction.nodesToRestore.push_back(container.restoreAfterNode);
    }
    removeSharedContainer(containerTag, transaction);
  }

  {
    auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
    containerTag = sharedTransitionManager_->nextContainerTag_;
    sharedTransitionManager_->nextContainerTag_ += 2;
  }
  const auto root = lightNodes_.at(surfaceId_);
  auto containerView = before;
  containerView.tag = containerTag;
  auto node = std::make_shared<LightNode>();
  node->current = std::move(containerView);
  node->parent = root;
  root->children.push_back(node);
  transaction.containersToInsert.push_back(node);
  const auto [_, inserted] = lightNodes_.emplace(containerTag, node);
  react_native_assert(inserted && "Shared container already exists");
  sharedContainers_.emplace(
      containerTag,
      SharedContainer{
          .sharedTag = sharedTag,
          .node = std::move(node),
      });
  return containerTag;
}

void LayoutAnimationsProxy_Experimental::handleSharedTransitionsStart(
    const std::shared_ptr<LightNode> &afterTopScreen,
    const std::shared_ptr<LightNode> &beforeTopScreen,
    TransactionMeta &transaction,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("LayoutAnimationsProxy_Experimental::handleSharedTransitionsStart");

  if (!beforeTopScreen || !afterTopScreen) {
    return;
  }

  if (beforeTopScreen != afterTopScreen) {
    for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;
      const auto &transform = transition.transform;
      overrideTransform(before, transform[BEFORE], propsParserContext);
      overrideTransform(after, transform[AFTER], propsParserContext);
      const auto config = layoutAnimationsManager_->getLayoutAnimationConfig(
          before.tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
      if (!config) {
        continue;
      }
      const auto &afterNode = collectedTransition.nodes[AFTER];
      react_native_assert(afterNode && "Shared transition target not found");
      if (!afterNode) {
        continue;
      }
      auto containerTag = getOrCreateContainer(before, sharedTag, transaction);
      auto &container = sharedContainers_.at(containerTag);
      if (container.restoreAfterNode && container.restoreAfterNode != afterNode) {
        transaction.nodesToRestore.push_back(container.restoreAfterNode);
      }
      container.restoreAfterNode = afterNode;
      before.tag = containerTag;
      after.tag = containerTag;

      startSharedTransition(containerTag, before, after, config);
    }
  } else if (!mutations.empty()) {
    for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;

      auto containerTag = Tag{-1};
      for (const auto &[tag, container] : sharedContainers_) {
        if (container.sharedTag == sharedTag && (hasPendingLayoutAnimation(tag) || layoutAnimations_.contains(tag)) &&
            tag > containerTag) {
          containerTag = tag;
        }
      }
      if (containerTag == -1) {
        continue;
      }
      const auto config = layoutAnimationsManager_->getLayoutAnimationConfig(
          before.tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
      if (!config) {
        continue;
      }
      const auto &afterNode = collectedTransition.nodes[AFTER];
      react_native_assert(afterNode && "Shared transition target not found");
      if (!afterNode) {
        continue;
      }
      auto &container = sharedContainers_.at(containerTag);
      if (container.restoreAfterNode && container.restoreAfterNode != afterNode) {
        transaction.nodesToRestore.push_back(container.restoreAfterNode);
      }
      container.restoreAfterNode = afterNode;
      overrideTransform(after, transition.transform[AFTER], propsParserContext);
      after.tag = containerTag;
      if (hasPendingLayoutAnimation(containerTag)) {
        updateLayoutAnimationTarget(containerTag, after, config);
        continue;
      }
      const auto &layoutAnimation = layoutAnimations_.at(containerTag);
      if (layoutAnimation.finalView.layoutMetrics != after.layoutMetrics) {
        startSharedTransition(containerTag, layoutAnimation.currentView, after, config);
      }
    }
  }
}

void LayoutAnimationsProxy_Experimental::hideTransitioningViews(
    BeforeOrAfter index,
    ShadowViewMutationList &mutations,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  for (const auto &[_, collectedTransition] : transaction.transitions) {
    const auto &transition = collectedTransition.transition;
    int indexNum = static_cast<int>(index);
    const auto &shadowView = transition.snapshot[indexNum];
    const auto &parentTag = transition.parentTag[indexNum];
    auto m = ShadowViewMutation::UpdateMutation(
        shadowView, cloneViewWithoutOpacity(shadowView, propsParserContext), parentTag);
    mutations.push_back(m);
    const auto &node = collectedTransition.nodes[indexNum];
    react_native_assert(node && "Shared transition view not found");
    if (node) {
      transaction.hiddenNodes.insert(node);
    }
  }
}

std::optional<SurfaceId> LayoutAnimationsProxy_Experimental::onTransitionProgress(
    int tag,
    double progress,
    bool isClosing,
    bool isGoingForward) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto nodeIt = lightNodes_.find(tag);
  if (nodeIt == lightNodes_.end() || !nodeIt->second) {
    return {};
  }
  transitionUpdated_ = true;
  bool isAndroid;
#ifdef ANDROID
  isAndroid = true;
#else
  isAndroid = false;
#endif
  // TODO (future): this new approach causes all back transitions to be progress
  // transitions (maybe that's ok?)
  if (isClosing && !isGoingForward && !isAndroid) {
    closingScreenTag_ = tag;
  }
  if (!isClosing && !isGoingForward && !isAndroid) {
    transitionProgress_ = progress;
    if (transitionState_ == TransitionState::NONE && progress < 1) {
      transitionState_ = TransitionState::START;
      transitionTag_ = tag;
    } else if (transitionState_ == TransitionState::ACTIVE && progress == 1) {
      transitionState_ = TransitionState::END;
    }
    return surfaceId_;
  }
  return {};
}

std::optional<SurfaceId> LayoutAnimationsProxy_Experimental::onGestureCancel(int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto nodeIt = lightNodes_.find(tag);
  if (nodeIt == lightNodes_.end() || !nodeIt->second) {
    return {};
  }
  if (static_cast<bool>(transitionState_)) {
    transitionState_ = TransitionState::CANCELLED;
    transitionUpdated_ = true;
    return surfaceId_;
  }
  return {};
}

void LayoutAnimationsProxy_Experimental::insertContainers(TransactionMeta &transaction, int &rootChildCount) const {
  auto &filteredMutations = transaction.filteredMutations;
  ShadowViewMutationList currentMutations;
  std::swap(currentMutations, filteredMutations);
  filteredMutations.reserve(transaction.containersToInsert.size() * 2);
  auto root = lightNodes_[surfaceId_];
  for (auto &node : transaction.containersToInsert) {
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(node->current));
    filteredMutations.push_back(ShadowViewMutation::InsertMutation(surfaceId_, node->current, rootChildCount++));
  }
  filteredMutations.insert(filteredMutations.end(), currentMutations.begin(), currentMutations.end());
}

void LayoutAnimationsProxy_Experimental::removeSharedContainer(Tag containerTag, TransactionMeta &transaction) const {
  const auto containerIt = sharedContainers_.find(containerTag);
  react_native_assert(containerIt != sharedContainers_.end() && "Unknown shared container");
  if (containerIt == sharedContainers_.end()) {
    return;
  }
  transaction.containersToRemove.push_back(std::move(containerIt->second.node));
  sharedContainers_.erase(containerIt);
}

void LayoutAnimationsProxy_Experimental::cleanupSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("cleanupSharedTransitions");
  auto &filteredMutations = transaction.filteredMutations;
  for (const auto &node : transaction.nodesToRestore) {
    ReanimatedSystraceSection s("Restore tag");
    if (transaction.hiddenNodes.contains(node)) {
      continue;
    }
    const auto nodeIt = lightNodes_.find(node->current.tag);
    if (nodeIt == lightNodes_.end() || nodeIt->second != node) {
      continue;
    }
    auto view = node->current;
    const auto parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");
    if (!parent) {
      continue;
    }
    const auto opacity = static_cast<const ViewProps &>(*view.props).opacity;
    filteredMutations.push_back(ShadowViewMutation::UpdateMutation(
        cloneViewWithoutOpacity(view, propsParserContext),
        cloneViewWithOpacity(view, opacity, propsParserContext),
        parent->current.tag));
  }

  ReanimatedSystraceSection s2("remove shared containers");
  const auto root = lightNodes_.at(surfaceId_);
  for (const auto &node : transaction.containersToRemove) {
    const auto childIt = std::ranges::find(root->children, node);
    react_native_assert(childIt != root->children.end() && "Shared container is not mounted");
    if (childIt != root->children.end()) {
      const auto index = static_cast<int>(std::distance(root->children.begin(), childIt));
      filteredMutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId_, node->current, index));
      filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
      root->children.erase(childIt);
    }

    const auto nodeIt = lightNodes_.find(node->current.tag);
    if (nodeIt != lightNodes_.end() && nodeIt->second == node) {
      lightNodes_.erase(nodeIt);
    }
  }
}

// MARK: Position Calculation

std::vector<react::Point> LayoutAnimationsProxy_Experimental::getAbsolutePositionsForRootPathView(
    const std::shared_ptr<LightNode> &node) const {
  std::vector<react::Point> viewsAbsolutePositions;
  auto currentNode = node;
  while (currentNode) {
    react::Point viewPosition;
    const auto &componentName = currentNode->current.componentName;
    react_native_assert(componentName && "Component name is nullptr");
    if (!strcmp(componentName, "ScrollView")) {
      auto state = std::static_pointer_cast<const ConcreteState<ScrollViewState>>(currentNode->current.state);
      auto data = state->getData();
      viewPosition -= data.contentOffset;
    }
    if (!strcmp(componentName, "RNSScreen") && currentNode->children.size() >= 2) {
      const auto &parent = currentNode->parent.lock();
      react_native_assert(parent && "Parent node is nullptr");

      const float headerHeight =
          parent->current.layoutMetrics.frame.size.height - currentNode->current.layoutMetrics.frame.size.height;
      viewPosition.y += headerHeight;
    }
    viewPosition += currentNode->current.layoutMetrics.frame.origin;
    viewsAbsolutePositions.emplace_back(viewPosition);
    currentNode = currentNode->parent.lock();
  }
  for (int i = static_cast<int>(viewsAbsolutePositions.size()) - 2; i >= 0; --i) {
    viewsAbsolutePositions[i] += viewsAbsolutePositions[i + 1];
  }
  return viewsAbsolutePositions;
}

std::optional<Transform> LayoutAnimationsProxy_Experimental::parseParentTransforms(
    const std::shared_ptr<LightNode> &node,
    const std::vector<react::Point> &absolutePositions) const {
  std::vector<std::pair<Transform, TransformOrigin>> transforms;
  auto currentNode = node;
  while (currentNode) {
    const auto &props = static_cast<const ViewProps &>(*currentNode->current.props);
    auto origin = props.transformOrigin;
    const auto &viewSize = currentNode->current.layoutMetrics.frame.size;
    if (origin.xy[0].unit == facebook::react::UnitType::Percent) {
      origin.xy[0] = {static_cast<float>(viewSize.width * origin.xy[0].value / 100), UnitType::Point};
    } else if (origin.xy[0].unit == facebook::react::UnitType::Undefined) {
      origin.xy[0] = {static_cast<float>(viewSize.width * 0.5), UnitType::Point};
    }
    if (origin.xy[1].unit == facebook::react::UnitType::Percent) {
      origin.xy[1] = {static_cast<float>(viewSize.height * origin.xy[1].value / 100), UnitType::Point};
    } else if (origin.xy[1].unit == facebook::react::UnitType::Undefined) {
      origin.xy[1] = {static_cast<float>(viewSize.height * 0.5), UnitType::Point};
    }
    transforms.emplace_back(props.transform, origin);
    currentNode = currentNode->parent.lock();
  }

  const auto &targetViewPosition = absolutePositions[0];
  Transform combinedMatrix;
  bool parentHasTransform = false;
  for (int i = static_cast<int>(transforms.size()) - 1; i >= 0; --i) {
    auto &[transform, transformOrigin] = transforms[i];
    if (transform.operations.empty()) {
      continue;
    } else if (i > 0) {
      parentHasTransform = true;
    }
    if (i == 0 && !parentHasTransform) {
      // If only target view has transform, let's skip it, to matrix decomposition in JS
      break;
    }
    transformOrigin.xy[0].value -= targetViewPosition.x - absolutePositions[i].x;
    transformOrigin.xy[1].value -= targetViewPosition.y - absolutePositions[i].y;
    combinedMatrix = combinedMatrix * resolveTransform(node->current.layoutMetrics, transform, transformOrigin);
    combinedMatrix.operations.clear();
  }
  if (parentHasTransform) {
    return Transform::FromTransformOperation(
        react::TransformOperation(TransformOperationType::Arbitrary), {}, combinedMatrix);
  }

  return {};
}

// The methods resolveTransform and getTranslateForTransformOrigin are sourced
// from:
// https://github.com/facebook/react-native/blob/v0.80.0/packages/react-native/ReactCommon/react/renderer/components/view/BaseViewProps.cpp#L548
// We need a copy of these methods to modify the `resolveTransform` method
// to accept the transform origin as a parameter instead of as a class field.
react::Transform LayoutAnimationsProxy_Experimental::resolveTransform(
    const LayoutMetrics &layoutMetrics,
    const Transform &transform,
    const TransformOrigin &transformOrigin) const {
  const auto &frameSize = layoutMetrics.frame.size;
  auto transformMatrix = Transform{};
  if (frameSize.width == 0 && frameSize.height == 0) {
    return transformMatrix;
  }

  if (transform.operations.size() == 1 &&
      transform.operations[0].type == facebook::react::TransformOperationType::Arbitrary) {
    transformMatrix = transform;
  } else {
    for (const auto &operation : transform.operations) {
      transformMatrix =
          transformMatrix * Transform::FromTransformOperation(operation, layoutMetrics.frame.size, transform);
    }
  }

  if (transformOrigin.isSet()) {
    std::array<float, 3> translateOffsets =
        getTranslateForTransformOrigin(frameSize.width, frameSize.height, transformOrigin);
    transformMatrix = Transform::Translate(translateOffsets[0], translateOffsets[1], translateOffsets[2]) *
        transformMatrix * Transform::Translate(-translateOffsets[0], -translateOffsets[1], -translateOffsets[2]);
  }

  return transformMatrix;
}

std::array<float, 3> LayoutAnimationsProxy_Experimental::getTranslateForTransformOrigin(
    float viewWidth,
    float viewHeight,
    const TransformOrigin &transformOrigin) const {
  const float viewCenterX = viewWidth / 2;
  const float viewCenterY = viewHeight / 2;

  std::array<float, 3> origin = {viewCenterX, viewCenterY, transformOrigin.z};

  for (int i = 0; i < static_cast<int>(transformOrigin.xy.size()); ++i) {
    const auto &currentOrigin = transformOrigin.xy[i];
    if (currentOrigin.unit == UnitType::Point) {
      origin[i] = currentOrigin.value;
    } else if (currentOrigin.unit == UnitType::Percent) {
      origin[i] = ((i == 0) ? viewWidth : viewHeight) * currentOrigin.value / 100.0f;
    }
  }

  const float newTranslateX = -viewCenterX + origin[0];
  const float newTranslateY = -viewCenterY + origin[1];
  const float newTranslateZ = origin[2];

  return {newTranslateX, newTranslateY, newTranslateZ};
}

} // namespace reanimated
