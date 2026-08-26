#include <folly/dynamic.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <ranges>

namespace reanimated {

// MARK: Shared Element Transitions

// A boundary is active when its `isActive` prop (controlled from JS,
// e.g. with `useIsFocused`) is true and it's not currently exiting.
std::shared_ptr<LightNode> LayoutAnimationsProxy::findActiveBoundary(const std::shared_ptr<LightNode> &node) const {
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

std::shared_ptr<LightNode> LayoutAnimationsProxy::findBoundaryGuess(const std::shared_ptr<LightNode> &node) const {
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

void LayoutAnimationsProxy::findSharedElementsOnScreen(
    const std::shared_ptr<LightNode> &node,
    BeforeOrAfter index,
    const PropsParserContext &propsParserContext) const {
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

    auto &transition = transitionMap_[*sharedTag];
    auto &[snapshot, parentTag, transform] = transition;
    auto newTransform = parseParentTransforms(node, absolutePositions);
    const auto &parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");

    int indexNum = static_cast<int>(index);
    transform[indexNum] = std::move(newTransform);
    snapshot[indexNum] = copy;
    parentTag[indexNum] = parent->current.tag;

    if (parentTag[BEFORE] && parentTag[AFTER]) {
      transitions_.emplace_back(*sharedTag, transition);
    } else if (parentTag[AFTER]) {
      // TODO (future): this is adding unnecessary views to the list
      tagsToRestore_.push_back(snapshot[AFTER].tag);
    }
  }
  for (auto &child : node->children) {
    findSharedElementsOnScreen(child, index, propsParserContext);
  }
}

void LayoutAnimationsProxy::handleProgressTransition(
    ShadowViewMutationList &filteredMutations,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
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
      findSharedElementsOnScreen(beforeTopScreen, BEFORE, propsParserContext);
      findSharedElementsOnScreen(afterTopScreen, AFTER, propsParserContext);
      hideTransitioningViews(BEFORE, filteredMutations, propsParserContext);
      hideTransitioningViews(AFTER, filteredMutations, propsParserContext);

      for (auto &[sharedTag, transition] : transitions_) {
        auto &[before, after] = transition.snapshot;
        const auto &transform = transition.transform;
        overrideTransform(before, transform[BEFORE], propsParserContext);
        overrideTransform(after, transform[AFTER], propsParserContext);
        auto containerTag = getOrCreateContainer(before, sharedTag, filteredMutations);
        transferConfigToContainer(containerTag, before.tag);

        restoreMap_[containerTag][BEFORE] = before.tag;
        restoreMap_[containerTag][AFTER] = after.tag;
        before.tag = containerTag;
        after.tag = containerTag;
        activeTransitions_.insert(containerTag);

        startProgressTransition(containerTag, before, after);
      }
    }
  } else if (transitionState_ == TransitionState::ACTIVE) {
    for (auto tag : activeTransitions_) {
      auto layoutAnimation = layoutAnimations_[tag];
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
    for (auto tag : activeTransitions_) {
      sharedContainersToRemove_.push_back(tag);
      tagsToRestore_.push_back(restoreMap_[tag][AFTER]);
      if (transitionState_ == TransitionState::CANCELLED) {
        tagsToRestore_.push_back(restoreMap_[tag][BEFORE]);
      }
    }
    if (transitionState_ == TransitionState::END) {
      synchronized_ = false;
    }
    containerTags_.clear();
    activeTransitions_.clear();
    transitionState_ = TransitionState::NONE;
  }
}

void LayoutAnimationsProxy::overrideTransform(
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

void LayoutAnimationsProxy::transferConfigToContainer(Tag containerTag, Tag beforeTag) const {
  layoutAnimationsManager_->transferSharedConfig(beforeTag, containerTag);
}

Tag LayoutAnimationsProxy::getOrCreateContainer(
    const ShadowView &before,
    const SharedTag &sharedTag,
    ShadowViewMutationList &filteredMutations) const {
  auto containerTag = containerTags_[sharedTag];
  auto shouldCreateContainer = true;
  if (containerTag != -1) {
    const auto layoutAnimationIt = layoutAnimations_.find(containerTag);
    shouldCreateContainer = layoutAnimationIt == layoutAnimations_.end() || layoutAnimationIt->second.isSettled();
  }

  if (shouldCreateContainer) {
    {
      auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
      containerTag = sharedTransitionManager_->nextContainerTag_;
      sharedTransitionManager_->nextContainerTag_ += 2;
      sharedTransitionManager_->tagToName_[containerTag] = sharedTag;
    }
    auto &root = lightNodes_[surfaceId_];
    ShadowView container = before;

    container.tag = containerTag;
    auto node = std::make_shared<LightNode>();
    node->current = std::move(container);
    root->children.push_back(node);
    containersToInsert_.push_back(node);
    lightNodes_[containerTag] = std::move(node);

    containerTags_[sharedTag] = containerTag;
  }
  return containerTag;
}

void LayoutAnimationsProxy::handleSharedTransitionsStart(
    const std::shared_ptr<LightNode> &afterTopScreen,
    const std::shared_ptr<LightNode> &beforeTopScreen,
    ShadowViewMutationList &filteredMutations,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("LayoutAnimationsProxy::handleSharedTransitionsStart");

  if (!beforeTopScreen || !afterTopScreen) {
    return;
  }

  if (beforeTopScreen != afterTopScreen) {
    for (auto &[sharedTag, transition] : transitions_) {
      auto &[before, after] = transition.snapshot;
      const auto &transform = transition.transform;
      overrideTransform(before, transform[BEFORE], propsParserContext);
      overrideTransform(after, transform[AFTER], propsParserContext);
      auto containerTag = getOrCreateContainer(before, sharedTag, filteredMutations);

      transferConfigToContainer(containerTag, before.tag);
      restoreMap_[containerTag][1] = after.tag;
      before.tag = containerTag;
      after.tag = containerTag;

      startSharedTransition(containerTag, before, after);
    }
  } else if (!mutations.empty()) {
    for (auto &[sharedTag, transition] : transitions_) {
      auto &[_, after] = transition.snapshot;

      auto containerTag = containerTags_[sharedTag];
      const auto layoutAnimationIt = layoutAnimations_.find(containerTag);
      if (layoutAnimationIt == layoutAnimations_.end() || layoutAnimationIt->second.isSettled()) {
        continue;
      }
      after.tag = containerTag;
      const auto &la = layoutAnimationIt->second;
      if (la.finalView.layoutMetrics != after.layoutMetrics) {
        overrideTransform(after, transition.transform[AFTER], propsParserContext);
        startSharedTransition(containerTag, la.currentView, after);
      }
    }
  }
}

void LayoutAnimationsProxy::hideTransitioningViews(
    BeforeOrAfter index,
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  for (auto &[sharedTag, transition] : transitions_) {
    int indexNum = static_cast<int>(index);
    const auto &shadowView = transition.snapshot[indexNum];
    const auto &parentTag = transition.parentTag[indexNum];
    hiddenViewTags_.insert(shadowView.tag);
    auto m = ShadowViewMutation::UpdateMutation(
        shadowView, cloneViewWithoutOpacity(shadowView, propsParserContext), parentTag);
    filteredMutations.push_back(m);
  }
}

// The hide in hideTransitioningViews is not stored in the light tree, so a
// later Update for the same view carries full opacity and would show the view
// again. Force opacity 0 on every outgoing Update for a hidden view until the
// restore in cleanupSharedTransitions removes its tag from hiddenViewTags_.
void LayoutAnimationsProxy::keepTransitioningViewsHidden(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  if (hiddenViewTags_.empty()) {
    return;
  }
  for (auto &mutation : filteredMutations) {
    if (mutation.type == ShadowViewMutation::Update && hiddenViewTags_.contains(mutation.newChildShadowView.tag)) {
      mutation = ShadowViewMutation::UpdateMutation(
          mutation.oldChildShadowView,
          cloneViewWithoutOpacity(mutation.newChildShadowView, propsParserContext),
          mutation.parentTag);
    }
  }
}

std::optional<SurfaceId>
LayoutAnimationsProxy::onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return {};
  }
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

std::optional<SurfaceId> LayoutAnimationsProxy::onGestureCancel(int tag) {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return {};
  }
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

void LayoutAnimationsProxy::insertContainers(ShadowViewMutationList &filteredMutations, int &rootChildCount) const {
  ShadowViewMutationList currentMutations;
  std::swap(currentMutations, filteredMutations);
  filteredMutations.reserve(containersToInsert_.size() * 2);
  auto root = lightNodes_[surfaceId_];
  for (auto &node : containersToInsert_) {
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(node->current));
    filteredMutations.push_back(ShadowViewMutation::InsertMutation(surfaceId_, node->current, rootChildCount++));
  }
  filteredMutations.insert(filteredMutations.end(), currentMutations.begin(), currentMutations.end());
  containersToInsert_.clear();
}

void LayoutAnimationsProxy::cleanupSharedTransitions(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("cleanupSharedTransitions");
  for (auto &tag : tagsToRestore_) {
    ReanimatedSystraceSection s("Restore tag");
    hiddenViewTags_.erase(tag);
    auto &node = lightNodes_[tag];
    if (node) {
      auto view = node->current;
      const auto &parent = node->parent.lock();
      react_native_assert(parent && "Parent node is nullptr");
      auto parentTag = parent->current.tag;
      auto m = ShadowViewMutation::UpdateMutation(
          cloneViewWithoutOpacity(view, propsParserContext), cloneViewWithOpacity(view, propsParserContext), parentTag);
      filteredMutations.push_back(m);
    }
  }
  tagsToRestore_.clear();

  ReanimatedSystraceSection s2("remove shared containers");
  for (auto &tag : sharedContainersToRemove_) {
    auto root = lightNodes_[surfaceId_];
    for (int i = 0; i < root->children.size(); i++) {
      auto &child = root->children[i];
      if (child->current.tag == tag) {
        filteredMutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId_, child->current, i));
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(child->current));
        root->children.erase(root->children.begin() + i);
      }
    }
  }
  sharedContainersToRemove_.clear();
}

// MARK: Position Calculation

std::vector<react::Point> LayoutAnimationsProxy::getAbsolutePositionsForRootPathView(
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

std::optional<Transform> LayoutAnimationsProxy::parseParentTransforms(
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
react::Transform LayoutAnimationsProxy::resolveTransform(
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

std::array<float, 3> LayoutAnimationsProxy::getTranslateForTransformOrigin(
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
