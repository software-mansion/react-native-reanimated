#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#ifndef ANDROID
#if __has_include(<react/renderer/components/rnscreens/Props.h>)
#define HAS_SCREENS_PROPS
#include <react/renderer/components/rnscreens/Props.h>
#endif
#endif // !ANDROID

#include <folly/dynamic.h>

#include <ranges>

namespace reanimated {

// MARK: Shared Element Transitions

std::shared_ptr<LightNode> LayoutAnimationsProxy_Experimental::findTopScreen(
    const std::shared_ptr<LightNode> &node) const {
  std::shared_ptr<LightNode> result = nullptr;
  // TODO: We could get rid of the RNScreens c++ dependency if we create a custom native component that would be a boundary for Shared Element Transitions.
  // This way we could allow for transitions without screens, and across components on the same screen.
  if (isRNSScreen(node)) {
    bool isActive = false;
#ifdef ANDROID
    // TODO (future): this looks like a RNScreens bug - sometimes there is no active
    // screen at a deeper level, when going back (uncomment the following when fixed)
    // float f = node->current.props->rawProps.getDefault("activityState",
    // 0).asDouble(); isActive = f == 2.0f;
    isActive = true;
#elif defined(HAS_SCREENS_PROPS)
    isActive = std::static_pointer_cast<const RNSScreenProps>(node->current.props)->activityState == 2.0f;
#endif
    if (isActive) {
      result = node;
    }
  }
  for (const auto &child : std::views::reverse(node->children)) {
    auto top = findTopScreen(child);
    if (top) {
      return top;
    }
  }

  return result;
}

void LayoutAnimationsProxy_Experimental::findSharedElementsOnScreen(
    const std::shared_ptr<LightNode> &node,
    BeforeOrAfter index,
    const PropsParserContext &propsParserContext) const {
  if (sharedTransitionManager_->tagToName_.contains(node->current.tag)) {
    ShadowView copy = node->current;
    std::vector<react::Point> absolutePositions;
    absolutePositions = getAbsolutePositionsForRootPathView(node);
    copy.layoutMetrics.frame.origin = absolutePositions[0];

    auto sharedTag = sharedTransitionManager_->tagToName_[node->current.tag];
    auto &transition = transitionMap_[sharedTag];
    auto &[snapshot, parentTag, transform] = transition;
    auto newTransform = parseParentTransforms(node, absolutePositions);
    const auto &parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");
    transform[index] = std::move(newTransform);
    snapshot[index] = copy;
    parentTag[index] = parent->current.tag;

    if (parentTag[BEFORE] && parentTag[AFTER]) {
      transitions_.emplace_back(sharedTag, transition);
    } else if (parentTag[AFTER]) {
      // TODO (future): this is adding unnecessary views to the list
      tagsToRestore_.push_back(snapshot[AFTER].tag);
    }
  }
  for (auto &child : node->children) {
    findSharedElementsOnScreen(child, index, propsParserContext);
  }
}

void LayoutAnimationsProxy_Experimental::handleProgressTransition(
    ShadowViewMutationList &filteredMutations,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  if (!transitionUpdated_) {
    return;
  }
  transitionUpdated_ = false;

  if (!mutations.empty() || !transitionState_) {
    return;
  }

  if (transitionState_ == START) {
    auto root = lightNodes_[surfaceId];
    auto beforeTopScreen = topScreen[surfaceId];
    auto afterTopScreen = lightNodes_[transitionTag_];
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
        auto containerTag = getOrCreateContainer(before, sharedTag, filteredMutations, surfaceId);
        transferConfigToContainer(containerTag, before.tag);

        restoreMap_[containerTag][BEFORE] = before.tag;
        restoreMap_[containerTag][AFTER] = after.tag;
        before.tag = containerTag;
        after.tag = containerTag;
        activeTransitions_.insert(containerTag);

        startProgressTransition(containerTag, before, after, surfaceId);
      }
    }
  } else if (transitionState_ == ACTIVE) {
    for (auto tag : activeTransitions_) {
      auto layoutAnimation = layoutAnimations_[tag];
      auto &updateMap = surfaceManager.getUpdateMap(layoutAnimation.finalView.surfaceId);
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

      updateMap.insert_or_assign(tag, UpdateValues{newProps, {x, y, width, height}});
    }
  }

  if (transitionState_ == START) {
    transitionState_ = ACTIVE;
  } else if (transitionState_ == END || transitionState_ == CANCELLED) {
    for (auto tag : activeTransitions_) {
      sharedContainersToRemove_.push_back(tag);
      tagsToRestore_.push_back(restoreMap_[tag][AFTER]);
      if (transitionState_ == CANCELLED) {
        tagsToRestore_.push_back(restoreMap_[tag][BEFORE]);
      }
    }
    if (transitionState_ == END) {
      topScreen[surfaceId] = lightNodes_[transitionTag_];
      synchronized_ = false;
    }
    sharedTransitionManager_->containerTags_.clear();
    activeTransitions_.clear();
    transitionState_ = NONE;
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

void LayoutAnimationsProxy_Experimental::transferConfigToContainer(Tag containerTag, Tag beforeTag) const {
  layoutAnimationsManager_->transferSharedConfig(beforeTag, containerTag);
}

Tag LayoutAnimationsProxy_Experimental::getOrCreateContainer(
    const ShadowView &before,
    const SharedTag &sharedTag,
    ShadowViewMutationList &filteredMutations,
    SurfaceId surfaceId) const {
  auto containerTag = sharedTransitionManager_->containerTags_[sharedTag];
  auto shouldCreateContainer = (containerTag == -1 || !layoutAnimations_.contains(containerTag));

  if (shouldCreateContainer) {
    containerTag = containerTag_;
    containerTag_ += 2;
    auto &root = lightNodes_[surfaceId];
    ShadowView container = before;
    sharedTransitionManager_->tagToName_[containerTag] = sharedTag;

    container.tag = containerTag;
    auto node = std::make_shared<LightNode>();
    node->current = std::move(container);
    root->children.push_back(node);
    containersToInsert_.push_back(node);
    lightNodes_[containerTag] = std::move(node);

    sharedTransitionManager_->containerTags_[sharedTag] = containerTag;
  }
  return containerTag;
}

void LayoutAnimationsProxy_Experimental::handleSharedTransitionsStart(
    const std::shared_ptr<LightNode> &afterTopScreen,
    const std::shared_ptr<LightNode> &beforeTopScreen,
    ShadowViewMutationList &filteredMutations,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  ReanimatedSystraceSection s1("LayoutAnimationsProxy_Experimental::handleSharedTransitionsStart");

  if (!beforeTopScreen || !afterTopScreen) {
    return;
  }

  if (beforeTopScreen != afterTopScreen) {
    for (auto &[sharedTag, transition] : transitions_) {
      auto &[before, after] = transition.snapshot;
      const auto &transform = transition.transform;
      overrideTransform(before, transform[BEFORE], propsParserContext);
      overrideTransform(after, transform[AFTER], propsParserContext);
      auto containerTag = getOrCreateContainer(before, sharedTag, filteredMutations, surfaceId);

      transferConfigToContainer(containerTag, before.tag);
      restoreMap_[containerTag][1] = after.tag;
      before.tag = containerTag;
      after.tag = containerTag;

      startSharedTransition(containerTag, before, after, surfaceId);
    }
  } else if (!mutations.empty()) {
    for (auto &[sharedTag, transition] : transitions_) {
      auto &[_, after] = transition.snapshot;

      auto containerTag = sharedTransitionManager_->containerTags_[sharedTag];
      if (!layoutAnimations_.contains(containerTag)) {
        continue;
      }
      after.tag = containerTag;
      const auto &la = layoutAnimations_[containerTag];
      if (la.finalView.layoutMetrics != after.layoutMetrics) {
        overrideTransform(after, transition.transform[AFTER], propsParserContext);
        startSharedTransition(containerTag, la.currentView, after, surfaceId);
      }
    }
  }
}

void LayoutAnimationsProxy_Experimental::hideTransitioningViews(
    BeforeOrAfter index,
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  for (auto &[sharedTag, transition] : transitions_) {
    const auto &shadowView = transition.snapshot[index];
    const auto &parentTag = transition.parentTag[index];
    auto m = ShadowViewMutation::UpdateMutation(
        shadowView, cloneViewWithoutOpacity(shadowView, propsParserContext), parentTag);
    filteredMutations.push_back(m);
  }
}

std::optional<SurfaceId> LayoutAnimationsProxy_Experimental::onTransitionProgress(
    int tag,
    double progress,
    bool isClosing,
    bool isGoingForward) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  transitionUpdated_ = true;
  bool isAndroid;
#ifdef ANDROID
  isAndroid = true;
#else
  isAndroid = false;
#endif
  // TODO (future): this new approach causes all back transitions to be progress
  // transitions (maybe that's ok?)
  if (!isClosing && !isGoingForward && !isAndroid) {
    transitionProgress_ = progress;
    if (transitionState_ == NONE && progress < 1) {
      transitionState_ = START;
      transitionTag_ = tag;
    } else if (transitionState_ == ACTIVE && progress == 1) {
      transitionState_ = END;
    }
    const auto &node = lightNodes_[tag];
    react_native_assert(node && "LightNode is nullptr");

    transitioningSurfaceId_ = node->current.surfaceId;
    return transitioningSurfaceId_;
  }
  return {};
}

std::optional<SurfaceId> LayoutAnimationsProxy_Experimental::onGestureCancel() {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (transitionState_) {
    transitionState_ = CANCELLED;
    transitionUpdated_ = true;
    react_native_assert(transitioningSurfaceId_ != -1 && "Cancelling non-observed transition");

    const auto surfaceId = transitioningSurfaceId_;
    transitioningSurfaceId_ = -1;
    return surfaceId;
  }
  return {};
}

void LayoutAnimationsProxy_Experimental::startSurface(const SurfaceId surfaceId) {
  const auto node = std::make_shared<LightNode>();
  node->current.componentName = "RootView";
  node->current.tag = surfaceId;
  node->current.props = std::make_shared<BaseViewProps>();
  lightNodes_[surfaceId] = node;
}

void LayoutAnimationsProxy_Experimental::insertContainers(
    ShadowViewMutationList &filteredMutations,
    int &rootChildCount,
    SurfaceId surfaceId) const {
  ShadowViewMutationList currentMutations;
  std::swap(currentMutations, filteredMutations);
  filteredMutations.reserve(containersToInsert_.size() * 2);
  auto root = lightNodes_[surfaceId];
  for (auto &node : containersToInsert_) {
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(node->current));
    filteredMutations.push_back(ShadowViewMutation::InsertMutation(surfaceId, node->current, rootChildCount++));
  }
  filteredMutations.insert(filteredMutations.end(), currentMutations.begin(), currentMutations.end());
  containersToInsert_.clear();
}

void LayoutAnimationsProxy_Experimental::cleanupSharedTransitions(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  ReanimatedSystraceSection s1("cleanupSharedTransitions");
  for (auto &tag : tagsToRestore_) {
    ReanimatedSystraceSection s("Restore tag");
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
    auto root = lightNodes_[surfaceId];
    for (int i = 0; i < root->children.size(); i++) {
      auto &child = root->children[i];
      if (child->current.tag == tag) {
        filteredMutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId, child->current, i));
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(child->current));
        root->children.erase(root->children.begin() + i);
      }
    }
  }
  sharedContainersToRemove_.clear();
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
