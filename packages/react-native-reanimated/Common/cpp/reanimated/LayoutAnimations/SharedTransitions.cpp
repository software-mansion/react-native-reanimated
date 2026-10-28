#include <folly/dynamic.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <algorithm>
#include <ranges>
#include <unordered_set>
#include <utility>

namespace reanimated {

// MARK: Shared Element Transitions

// A boundary is active when its `isActive` prop (controlled from JS,
// e.g. with `useIsFocused`) is true and it's not currently exiting.
std::shared_ptr<LightNode> LayoutAnimationsProxy::findActiveBoundary(const std::shared_ptr<LightNode> &node) const {
  if (node->isExiting()) {
    return nullptr;
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

  return nullptr;
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
    TransactionMeta &transaction) const {
  if (node->isExiting()) {
    return;
  }
  if (const auto sharedTag = findSharedTag(node->current)) {
    if (const auto staleTag = staleSynchronousProps_.find(node, LayoutAnimationType::SHARED_ELEMENT_TRANSITION)) {
      transaction.staleSnapshots[node->current.tag] = *staleTag;
    }
    resolveLightNodeProps(node);
    const bool useViewsOnScreen = index == BEFORE;
    ShadowView copy = useViewsOnScreen ? viewOnScreen(node) : node->current;
    std::vector<react::Point> absolutePositions;
    absolutePositions = getAbsolutePositionsForRootPathView(node, useViewsOnScreen);
    copy.layoutMetrics.frame.origin = absolutePositions[0];

    auto &collectedTransition = transaction.transitionMap[*sharedTag];
    auto &transition = collectedTransition.transition;
    auto &[snapshot, parentTag, transform, ancestorOpacity, clip] = transition;
    auto newTransform = parseParentTransforms(node, absolutePositions, useViewsOnScreen);
    const auto &parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");

    int indexNum = static_cast<int>(index);
    transform[indexNum] = std::move(newTransform);
    parseAncestorOpacityAndClip(node, absolutePositions, useViewsOnScreen, ancestorOpacity[indexNum], clip[indexNum]);
    snapshot[indexNum] = copy;
    parentTag[indexNum] = parent->current.tag;
    collectedTransition.nodes[indexNum] = node;

    if (parentTag[BEFORE] && parentTag[AFTER]) {
      transaction.transitions.emplace_back(*sharedTag, collectedTransition);
    } else if (parentTag[AFTER]) {
      transaction.restoreRequests.push_back({*sharedTag, node});
    }
  }
  for (auto &child : node->children) {
    findSharedElementsOnScreen(child, index, transaction);
  }
}

std::optional<SharedTag> LayoutAnimationsProxy::findSharedTag(const ShadowView &view) const {
  if (!isViewKind(view)) {
    return std::nullopt;
  }
  auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  const auto it = sharedTransitionManager_->tagToName_.find(view.tag);
  if (it == sharedTransitionManager_->tagToName_.end()) {
    return std::nullopt;
  }
  return it->second;
}

void LayoutAnimationsProxy::resolveTransitionLifecycle(
    TransactionMeta &transaction,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  bool popSettledThisPull = false;
  if (uncommittedScreenPop_) {
    const bool gestureCancelled = uncommittedScreenPop_->cancelled && uncommittedScreenPop_->sourceScreen;
    if (!settleUncommittedScreenPop(transaction)) {
      return;
    }
    popSettledThisPull = true;
    if (gestureCancelled && transition_ && !transition_->sourceScreen) {
      // A deferred-source transition inside a cancelled gesture's settle window is that same
      // gesture reversing; its cancel was already consumed by the uncommitted pop.
      transition_->state = TransitionState::CANCELLED;
      transition_->updated = true;
    } else {
      resolveDeferredSourceScreen();
    }
  }
  if (!transition_) {
    return;
  }
  handleProgressTransition(transaction, mutations, propsParserContext, popSettledThisPull);
}

bool LayoutAnimationsProxy::settleUncommittedScreenPop(TransactionMeta &transaction) const {
  if (uncommittedScreenPop_->sourceScreen && !uncommittedScreenPop_->cancelled) {
    return false;
  }
  if (uncommittedScreenPop_->sourceScreen) {
    for (const auto &source : uncommittedScreenPop_->sources) {
      if (isLightNodeMapped(source.node)) {
        transaction.restoreRequests.push_back(source);
      }
    }
  }
  topScreen_ = findActiveBoundary(lightNodes_.at(surfaceId_));
  uncommittedScreenPop_.reset();
  return true;
}

// A gesture that starts while the previous one still awaits its source
// removal cannot know its own source screen until topScreen_ is recomputed.
void LayoutAnimationsProxy::resolveDeferredSourceScreen() const {
  const bool needsSourceScreen = transition_ && !transition_->sourceScreen &&
      (transition_->state == TransitionState::START || transition_->state == TransitionState::END);
  if (!needsSourceScreen) {
    return;
  }
  const auto sourceScreen = topScreen_ ? findParentRNSScreen(topScreen_) : nullptr;
  if (!sourceScreen || !visibleScreens_.contains(sourceScreen->current.tag) || !transition_->targetScreen ||
      sourceScreen->current.tag == transition_->targetScreen->current.tag) {
    transition_->state = TransitionState::CANCELLED;
    transition_->updated = true;
    return;
  }
  transition_->sourceScreen = sourceScreen;
}

void LayoutAnimationsProxy::handleProgressTransition(
    TransactionMeta &transaction,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext,
    const bool popSettledThisPull) const {
  if (!transition_->updated) {
    return;
  }
  if (transition_->state == TransitionState::START && !mutations.empty() && !popSettledThisPull) {
    schedulePullOnNextFrame();
    return;
  }
  transition_->updated = false;

  if (transition_->state == TransitionState::START) {
    const auto beforeTopScreen = topScreen_;
    const auto afterTopScreen = findBoundaryGuess(transition_->targetScreen);
    const auto beforeScreen = beforeTopScreen ? findParentRNSScreen(beforeTopScreen) : nullptr;
    if (!transition_->sourceScreen || !transition_->targetScreen ||
        transition_->sourceScreen->current.tag == transition_->targetScreen->current.tag || !beforeTopScreen ||
        beforeScreen != transition_->sourceScreen || !afterTopScreen || beforeTopScreen == afterTopScreen) {
      transition_->state = TransitionState::CANCELLED;
    } else {
      findSharedElementsOnScreen(beforeTopScreen, BEFORE, transaction);
      findSharedElementsOnScreen(afterTopScreen, AFTER, transaction);
      hideTransitioningViews(BEFORE, transaction, propsParserContext);
      hideTransitioningViews(AFTER, transaction, propsParserContext);

      for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
        auto &transition = collectedTransition.transition;
        auto &[before, after] = transition.snapshot;
        fitClipOfUnclippedSide(transition);
        const bool clipped = usesClip(sharedTag, transition);
        applyAncestorEffects(before, transition, BEFORE, propsParserContext);
        applyAncestorEffects(after, transition, AFTER, propsParserContext);
        const auto &[beforeNode, afterNode] = collectedTransition.nodes;
        react_native_assert(beforeNode && "Shared transition source not found");
        react_native_assert(afterNode && "Shared transition target not found");
        if (!beforeNode || !afterNode) {
          continue;
        }
        warnIfSnapshotIsStale(before, transaction);
        warnIfSnapshotIsStale(after, transaction);

        std::optional<ShadowView> clipBefore;
        if (clipped) {
          clipBefore = createClipView(transition.clip[BEFORE], before, propsParserContext);
        }
        const auto &run = startSharedTransitionRun(
            before, clipBefore ? &*clipBefore : nullptr, sharedTag, collectedTransition.nodes, true, transaction);
        const auto containerTag = run.container->current.tag;
        before.tag = containerTag;
        after.tag = containerTag;
        auto parentTag = surfaceId_;
        if (run.clip) {
          auto clipAfter = createClipView(transition.clip[AFTER], after, propsParserContext);
          parentTag = run.clip->current.tag;
          clipBefore->tag = parentTag;
          clipAfter.tag = parentTag;
          startProgressTransition(parentTag, *clipBefore, clipAfter, surfaceId_);
        }

        startProgressTransition(containerTag, before, after, parentTag);
      }
    }
  } else if (transition_->state == TransitionState::ACTIVE) {
    for (const auto &[_, element] : sharedElements_) {
      if (!element.run || !element.run->gestureDriven) {
        continue;
      }
      for (const auto &node : runNodes(*element.run)) {
        const auto tag = node->current.tag;
        if (hasPendingLayoutAnimation(tag)) {
          continue;
        }
        const auto layoutAnimationIt = layoutAnimations_.find(tag);
        if (layoutAnimationIt == layoutAnimations_.end()) {
          react_native_assert(false && "Shared transition animation not found");
          continue;
        }
        const auto &layoutAnimation = layoutAnimationIt->second;
        const auto progress = transition_->progress;
        auto before = layoutAnimation.startView.layoutMetrics.frame;
        auto after = layoutAnimation.finalView.layoutMetrics.frame;
        auto x = before.origin.x + progress * (after.origin.x - before.origin.x);
        auto y = before.origin.y + progress * (after.origin.y - before.origin.y);
        auto width = before.size.width + progress * (after.size.width - before.size.width);
        auto height = before.size.height + progress * (after.size.height - before.size.height);

        auto beforeProps = std::static_pointer_cast<const BaseViewProps>(layoutAnimation.startView.props);
        auto afterProps = std::static_pointer_cast<const BaseViewProps>(layoutAnimation.finalView.props);
        auto beforeRadius = beforeProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point)).value;
        auto afterRadius = afterProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point)).value;

        // TODO (future): Support more props in progress transitions.
        auto interpolatedProps =
            folly::dynamic::object("borderRadius", beforeRadius + progress * (afterRadius - beforeRadius))(
                "opacity", beforeProps->opacity + progress * (afterProps->opacity - beforeProps->opacity));

#ifdef RN_SERIALIZABLE_STATE
        // TODO (future): Support borderRadius on Android.
        const Props::Shared newProps = nullptr;
#else
        auto rawProps = RawProps(std::move(interpolatedProps));

        auto newProps = componentDescriptorRegistry_->at(layoutAnimation.finalView.componentHandle)
                            .cloneProps(propsParserContext, layoutAnimation.finalView.props, std::move(rawProps));
#endif

        updateMap_.insert_or_assign(tag, UpdateValues{newProps, {x, y, width, height}});
      }
    }
  }

  if (transition_->state == TransitionState::START) {
    transition_->state = TransitionState::ACTIVE;
  } else if (transition_->state == TransitionState::END || transition_->state == TransitionState::CANCELLED) {
    std::vector<RestoreRequest> sources;
    for (auto &[sharedTag, element] : sharedElements_) {
      if (!element.run || !element.run->gestureDriven) {
        continue;
      }
      sources.push_back({sharedTag, element.run->source});
      const auto tag = element.run->container->current.tag;
      finishSharedTransition(sharedTag, element, transaction);
      cancelLayoutAnimation(tag);
    }
    if (transition_->state == TransitionState::END) {
      react_native_assert(!uncommittedScreenPop_ && "Previous screen pop not settled");
      react_native_assert(transition_->sourceScreen && "Shared transition source not found");
      if (transition_->sourceScreen) {
        uncommittedScreenPop_ = UncommittedScreenPop{transition_->sourceScreen, std::move(sources)};
      }
    } else {
      topScreen_ = findActiveBoundary(lightNodes_.at(surfaceId_));
      for (const auto &source : sources) {
        if (isLightNodeMapped(source.node)) {
          transaction.restoreRequests.push_back(source);
        }
      }
    }
    transition_.reset();
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
  react_native_assert(isViewKind(shadowView) && "Only ViewKind views have ViewProps");
#ifdef ANDROID
  auto array = folly::dynamic::array(folly::dynamic::object("matrix", transform->operator folly::dynamic()));
  const folly::dynamic newTransformDynamic = folly::dynamic::object("transform", array);
  auto newRawProps = folly::dynamic::merge(shadowView.props->rawProps, newTransformDynamic);
  auto newProps = componentDescriptorRegistry_->at(shadowView.componentHandle)
                      .cloneProps(propsParserContext, shadowView.props, RawProps(newRawProps));
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
#else
  auto newProps =
      componentDescriptorRegistry_->at(shadowView.componentHandle).cloneProps(propsParserContext, shadowView.props, {});
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(newProps));
  viewProps->transform = *transform;
#endif
  shadowView.props = newProps;
}

// The container draws the view the way its ancestors draw it, inside the clip.
void LayoutAnimationsProxy::applyAncestorEffects(
    ShadowView &shadowView,
    const Transition &transition,
    const BeforeOrAfter index,
    const PropsParserContext &propsParserContext) const {
  const int indexNum = static_cast<int>(index);
  overrideTransform(shadowView, transition.transform[indexNum], propsParserContext);
  shadowView = cloneViewWithOpacity(
      shadowView, getViewProps(shadowView).opacity * transition.ancestorOpacity[indexNum], propsParserContext);
  shadowView.layoutMetrics.frame.origin -= transition.clip[indexNum].frame.origin;
}

// A side that its ancestors do not clip ends on the frame of its view, so the clip morphs with the view. The
// clip stays the window when neither side is clipped, or when the container can draw outside the frame of the view.
void LayoutAnimationsProxy::fitClipOfUnclippedSide(Transition &transition) const {
  const auto &window = windowFrame();
  for (const int index : {BEFORE, AFTER}) {
    const int other = 1 - index;
    const auto &view = transition.snapshot[index];
    if (transition.clip[index].frame != window || transition.clip[other].frame == window ||
        !drawsWithinFrame(view, transition.transform[index])) {
      continue;
    }
    transition.clip[index] = {.frame = react::Rect::intersect(view.layoutMetrics.frame, window)};
  }
}

// The container has no children, so only its transforms and decorations reach outside its frame. The transforms of the
// ancestors can compose to the identity, for example on a screen.
bool LayoutAnimationsProxy::drawsWithinFrame(const ShadowView &view, const std::optional<Transform> &ancestorTransform)
    const {
  const auto &props = getViewProps(view);
  const auto &size = view.layoutMetrics.frame.size;
#ifdef ANDROID
  if (props.elevation != 0) {
    return false;
  }
#endif
  return (!ancestorTransform || ancestorTransform->matrix == Transform::Identity().matrix) &&
      props.transform.operations.empty() && size.width > 0 && size.height > 0 && props.boxShadow.empty() &&
      props.shadowOpacity == 0 && props.outlineWidth == 0;
}

ShadowView LayoutAnimationsProxy::createClipView(
    const AncestorClip &clip,
    const ShadowView &source,
    const PropsParserContext &propsParserContext) const {
  const auto &descriptor = componentDescriptorRegistry_->at("View");
  ShadowView clipView;
  clipView.componentName = descriptor.getComponentName();
  clipView.componentHandle = descriptor.getComponentHandle();
  clipView.surfaceId = surfaceId_;
  clipView.traits = descriptor.getTraits();
  // iOS mounts a view only with a view event emitter.
  clipView.eventEmitter = source.eventEmitter;
  clipView.layoutMetrics.frame = clip.frame;
  clipView.layoutMetrics.pointScaleFactor = source.layoutMetrics.pointScaleFactor;
  clipView.props = descriptor.cloneProps(
      propsParserContext,
      nullptr,
      RawProps(folly::dynamic::object("overflow", "hidden")("pointerEvents", "box-none")(
          "borderRadius", clip.borderRadius)));
  return clipView;
}

std::vector<std::shared_ptr<LightNode>> LayoutAnimationsProxy::runNodes(const SharedTransitionRun &run) const {
  if (run.clip) {
    return {run.container, run.clip};
  }
  return {run.container};
}

// A run gets a clip only when it starts clipped on a side. A run that continues without a clip ignores the clipping
// that appears later, like before clipping was supported.
bool LayoutAnimationsProxy::usesClip(const SharedTag &sharedTag, Transition &transition) const {
  const auto &window = windowFrame();
  const auto elementIt = sharedElements_.find(sharedTag);
  const auto *run = elementIt != sharedElements_.end() && elementIt->second.run ? &*elementIt->second.run : nullptr;
  const bool clipped = run && isRunAnimating(*run)
      ? run->clip != nullptr
      : transition.clip[BEFORE].frame != window || transition.clip[AFTER].frame != window;
  if (!clipped) {
    transition.clip[BEFORE] = transition.clip[AFTER] = {.frame = window};
  }
  return clipped;
}

const react::Rect &LayoutAnimationsProxy::windowFrame() const {
  return lightNodes_.at(surfaceId_)->current.layoutMetrics.frame;
}

bool LayoutAnimationsProxy::isRunAnimating(const SharedTransitionRun &run) const {
  return std::ranges::any_of(runNodes(run), [this](const auto &node) {
    const auto tag = node->current.tag;
    return hasPendingLayoutAnimation(tag) || layoutAnimations_.contains(tag);
  });
}

// The run keeps the record of an animation that ended until the run ends.
const LayoutAnimation &LayoutAnimationsProxy::runAnimation(const std::shared_ptr<LightNode> &node) const {
  const auto tag = node->current.tag;
  const auto it = layoutAnimations_.find(tag);
  return it != layoutAnimations_.end() ? it->second : completedAnimations_.at(tag).animation;
}

// Compares what applyAncestorEffects and createClipView change.
bool LayoutAnimationsProxy::endsTheSame(const ShadowView &finalView, const ShadowView &target) const {
  const auto &finalProps = getViewProps(finalView);
  const auto &targetProps = getViewProps(target);
  return finalView.layoutMetrics == target.layoutMetrics && finalProps.transform == targetProps.transform &&
      finalProps.opacity == targetProps.opacity && finalProps.borderRadii == targetProps.borderRadii;
}

SharedTransitionRun &LayoutAnimationsProxy::startSharedTransitionRun(
    const ShadowView &before,
    const ShadowView *clip,
    const SharedTag &sharedTag,
    const std::array<std::shared_ptr<LightNode>, 2> &nodes,
    const bool gestureDriven,
    TransactionMeta &transaction) const {
  auto &run = sharedElements_[sharedTag].run;
  if (run) {
    const auto &oldTarget = run->target;
    if (oldTarget != nodes[BEFORE] && oldTarget != nodes[AFTER]) {
      transaction.restoreRequests.push_back({sharedTag, oldTarget});
    }
    if (!isRunAnimating(*run)) {
      react_native_assert(
          completedAnimations_.contains(run->container->current.tag) && "Shared container has no animation");
      removeRun(*run, transaction);
      run.reset();
    }
  }
  if (!run) {
    run = createSharedContainer(before, clip);
    transaction.containersToInsert.push_back(sharedTag);
  }
  run->source = nodes[BEFORE];
  run->target = nodes[AFTER];
  run->gestureDriven = gestureDriven;
  return *run;
}

SharedTransitionRun LayoutAnimationsProxy::createSharedContainer(const ShadowView &before, const ShadowView *clip)
    const {
  Tag containerTag = -1;
  Tag clipTag = -1;
  {
    auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
    containerTag = sharedTransitionManager_->nextContainerTag_;
    clipTag = containerTag + 2;
    sharedTransitionManager_->nextContainerTag_ += 4;
  }
  const auto root = lightNodes_.at(surfaceId_);
  if (!clip) {
    return SharedTransitionRun{.container = createSharedNode(before, containerTag, root)};
  }
  const auto clipNode = createSharedNode(*clip, clipTag, root);
  return SharedTransitionRun{
      .container = createSharedNode(before, containerTag, clipNode),
      .clip = clipNode,
  };
}

std::shared_ptr<LightNode> LayoutAnimationsProxy::createSharedNode(
    const ShadowView &view,
    const Tag tag,
    const std::shared_ptr<LightNode> &parent) const {
  auto node = std::make_shared<LightNode>();
  node->current = view;
  node->current.tag = tag;
#ifdef ANDROID
  react_native_assert(node->current.props && "Shared container has no props");
  node->accumulatedRawProps = node->current.props->rawProps;
#endif
  node->parent = parent;
  parent->children.push_back(node);
  [[maybe_unused]] const auto [_, inserted] = lightNodes_.emplace(tag, node);
  react_native_assert(inserted && "Shared container already exists");
  return node;
}

// The clip is preserved while the run lives, so its animation ends with the run.
void LayoutAnimationsProxy::removeRun(const SharedTransitionRun &run, TransactionMeta &transaction) const {
  transaction.containersToRemove.push_back(run.container);
  if (run.clip) {
    cancelLayoutAnimation(run.clip->current.tag);
  }
}

void LayoutAnimationsProxy::handleSharedTransitionsStart(
    const std::shared_ptr<LightNode> &afterTopScreen,
    const std::shared_ptr<LightNode> &beforeTopScreen,
    TransactionMeta &transaction,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("LayoutAnimationsProxy::handleSharedTransitionsStart");

  if (!beforeTopScreen || !afterTopScreen) {
    return;
  }

  if (beforeTopScreen != afterTopScreen) {
    for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;
      fitClipOfUnclippedSide(transition);
      const bool clipped = usesClip(sharedTag, transition);
      applyAncestorEffects(before, transition, BEFORE, propsParserContext);
      applyAncestorEffects(after, transition, AFTER, propsParserContext);
      const auto config = layoutAnimationsManager_->getLayoutAnimationConfig(
          before.tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
      if (!config) {
        for (const auto &node : collectedTransition.nodes) {
          if (node) {
            transaction.restoreRequests.push_back({sharedTag, node});
          }
        }
        continue;
      }
      const auto &afterNode = collectedTransition.nodes[AFTER];
      react_native_assert(afterNode && "Shared transition target not found");
      if (!afterNode) {
        continue;
      }
      warnIfSnapshotIsStale(before, transaction);
      warnIfSnapshotIsStale(after, transaction);
      std::optional<ShadowView> clipBefore;
      if (clipped) {
        clipBefore = createClipView(transition.clip[BEFORE], before, propsParserContext);
      }
      const auto &run = startSharedTransitionRun(
          before, clipBefore ? &*clipBefore : nullptr, sharedTag, collectedTransition.nodes, false, transaction);
      const auto containerTag = run.container->current.tag;
      before.tag = containerTag;
      after.tag = containerTag;
      auto parentTag = surfaceId_;
      if (run.clip) {
        auto clipAfter = createClipView(transition.clip[AFTER], after, propsParserContext);
        parentTag = run.clip->current.tag;
        clipBefore->tag = parentTag;
        clipAfter.tag = parentTag;
        startClipTransition(parentTag, *clipBefore, clipAfter, config);
      }

      startSharedTransition(containerTag, before, after, parentTag, config);
    }
  } else if (!mutations.empty()) {
    for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;

      const auto elementIt = sharedElements_.find(sharedTag);
      if (elementIt == sharedElements_.end() || !elementIt->second.run) {
        continue;
      }
      auto &run = *elementIt->second.run;
      const auto containerTag = run.container->current.tag;
      if (!isRunAnimating(run)) {
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
      if (run.target != afterNode) {
        transaction.restoreRequests.push_back({sharedTag, run.target});
      }
      run.target = afterNode;
      if (run.clip) {
        // The run keeps its source, so the clip on screen stands for the clip of the source.
        transition.clip[BEFORE].frame = viewOnScreen(run.clip).layoutMetrics.frame;
        fitClipOfUnclippedSide(transition);
      } else {
        transition.clip[AFTER] = {.frame = windowFrame()};
      }
      applyAncestorEffects(after, transition, AFTER, propsParserContext);
      after.tag = containerTag;
      std::optional<ShadowView> clipAfter;
      if (run.clip) {
        clipAfter = createClipView(transition.clip[AFTER], after, propsParserContext);
        clipAfter->tag = run.clip->current.tag;
      }
      if (hasPendingLayoutAnimation(containerTag)) {
        if (clipAfter) {
          updateLayoutAnimationTarget(clipAfter->tag, *clipAfter, config);
        }
        updateLayoutAnimationTarget(containerTag, after, config);
        continue;
      }
      const auto &containerAnimation = runAnimation(run.container);
      const bool clipChanged = clipAfter && !endsTheSame(runAnimation(run.clip).finalView, *clipAfter);
      if (endsTheSame(containerAnimation.finalView, after) && !clipChanged) {
        continue;
      }
      auto parentTag = surfaceId_;
      if (clipAfter) {
        parentTag = clipAfter->tag;
        startClipTransition(parentTag, runAnimation(run.clip).currentView, *clipAfter, config);
      }
      startSharedTransition(containerTag, containerAnimation.currentView, after, parentTag, config);
    }
  }
}

void LayoutAnimationsProxy::hideTransitioningViews(
    BeforeOrAfter index,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  ShadowViewMutationList hiddenMutations;
  hiddenMutations.reserve(transaction.transitions.size());
  for (const auto &[sharedTag, collectedTransition] : transaction.transitions) {
    const auto &transition = collectedTransition.transition;
    int indexNum = static_cast<int>(index);
    const auto &shadowView = transition.snapshot[indexNum];
    const auto &parentTag = transition.parentTag[indexNum];
    const auto &node = collectedTransition.nodes[indexNum];
    react_native_assert(node && "Shared transition view not found");
    hideInSharedElement(sharedTag, node);
    auto m = ShadowViewMutation::UpdateMutation(
        shadowView, cloneViewWithoutOpacity(shadowView, propsParserContext), parentTag);
    hiddenMutations.push_back(m);
  }
  auto &filteredMutations = transaction.filteredMutations;
  const auto insertionPoint = index == BEFORE ? filteredMutations.begin() : filteredMutations.end();
  filteredMutations.insert(insertionPoint, hiddenMutations.begin(), hiddenMutations.end());
}

// The hide in hideTransitioningViews is not stored in the light tree, so a
// later Update or Insert for the same view carries full opacity and would show
// the view again. Force opacity 0 on every outgoing Update and Insert for a
// hidden view until the restore in cleanupSharedTransitions removes it from
// its shared element.
void LayoutAnimationsProxy::keepTransitioningViewsHidden(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  const auto hiddenTags = hiddenViewTags();
  if (hiddenTags.empty()) {
    return;
  }
  for (auto &mutation : filteredMutations) {
    const bool writesProps = mutation.type == ShadowViewMutation::Update || mutation.type == ShadowViewMutation::Insert;
    if (writesProps && hiddenTags.contains(mutation.newChildShadowView.tag)) {
      mutation.newChildShadowView = cloneViewWithoutOpacity(mutation.newChildShadowView, propsParserContext);
    }
  }
}

std::optional<SurfaceId>
LayoutAnimationsProxy::onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward) {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return {};
  }
#ifdef ANDROID
  return {};
#endif
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  updateVisibleScreens(tag, progress, isClosing);
  if (!isClosing && isUncommittedScreenPopSource(tag)) {
    return cancelUncommittedScreenPop();
  }
  // TODO (future): this new approach causes all back transitions to be progress
  // transitions (maybe that's ok?)
  if (isClosing || isGoingForward) {
    return {};
  }
  if (transition_ && (!transition_->targetScreen || tag != transition_->targetScreen->current.tag)) {
    return {};
  }
  if (transition_ && transition_->state == TransitionState::CANCELLED) {
    return {};
  }
  if (!transition_) {
    const auto targetIt = lightNodes_.find(tag);
    if (targetIt == lightNodes_.end() || !targetIt->second || progress >= 1) {
      return {};
    }
    std::shared_ptr<LightNode> sourceScreen;
    if (!uncommittedScreenPop_) {
      sourceScreen = topScreen_ ? findParentRNSScreen(topScreen_) : nullptr;
      if (!sourceScreen || sourceScreen->current.tag == tag || !visibleScreens_.contains(sourceScreen->current.tag)) {
        return {};
      }
    }
    transition_ = ProgressTransition{
        .sourceScreen = sourceScreen,
        .targetScreen = targetIt->second,
    };
  }
  transition_->progress = progress;
  if ((transition_->state == TransitionState::START || transition_->state == TransitionState::ACTIVE) &&
      progress == 1) {
    transition_->state = TransitionState::END;
  }
  transition_->updated = true;
  return surfaceId_;
}

std::optional<SurfaceId> LayoutAnimationsProxy::onGestureCancel(int tag) {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return {};
  }
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  markScreenVisible(tag);
  if (isUncommittedScreenPopSource(tag)) {
    return cancelUncommittedScreenPop();
  }

  if (!transition_ || transition_->state == TransitionState::CANCELLED) {
    return {};
  }
  if (transition_->sourceScreen) {
    if (transition_->sourceScreen->current.tag != tag) {
      return {};
    }
  } else {
    const auto sourceIt = lightNodes_.find(tag);
    if (sourceIt == lightNodes_.end() || !sourceIt->second || !isRNSScreen(sourceIt->second) ||
        !isRNSScreen(transition_->targetScreen)) {
      return {};
    }
    const auto sourceScreen = sourceIt->second;
    const auto sourceParent = sourceScreen->parent.lock();
    const auto targetParent = transition_->targetScreen->parent.lock();
    if (sourceScreen == transition_->targetScreen || !sourceParent || sourceParent != targetParent) {
      return {};
    }
    transition_->sourceScreen = sourceScreen;
  }

  transition_->state = TransitionState::CANCELLED;
  transition_->updated = true;
  return surfaceId_;
}

// A change of the shared tag alone gives no host mutations, so the pull that applies the config is requested here.
void LayoutAnimationsProxy::onSharedTransitionConfigured(const std::vector<Tag> &viewTags) {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return;
  }
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (sharedElements_.empty()) {
    return;
  }
  const auto hiddenTags = hiddenViewTags();
  const bool configuresHiddenView =
      std::ranges::any_of(viewTags, [&hiddenTags](const Tag tag) { return hiddenTags.contains(tag); });
  if (configuresHiddenView) {
    schedulePullOnNextFrame();
  }
}

void LayoutAnimationsProxy::updateVisibleScreens(const int tag, const double progress, const bool isClosing) const {
  if (progress != 1) {
    return;
  }
  if (isClosing) {
    visibleScreens_.erase(tag);
  } else {
    markScreenVisible(tag);
  }
}

void LayoutAnimationsProxy::markScreenVisible(const int tag) const {
  if (lightNodes_.contains(tag)) {
    visibleScreens_.insert(tag);
  }
}

bool LayoutAnimationsProxy::isUncommittedScreenPopSource(const int tag) const {
  return uncommittedScreenPop_ && uncommittedScreenPop_->sourceScreen &&
      uncommittedScreenPop_->sourceScreen->current.tag == tag;
}

std::optional<SurfaceId> LayoutAnimationsProxy::cancelUncommittedScreenPop() const {
  react_native_assert(uncommittedScreenPop_ && "No uncommitted screen pop to cancel");
  if (uncommittedScreenPop_->cancelled) {
    return {};
  }
  uncommittedScreenPop_->cancelled = true;
  return surfaceId_;
}

void LayoutAnimationsProxy::insertContainers(TransactionMeta &transaction, int &rootChildCount) const {
  auto &filteredMutations = transaction.filteredMutations;
  ShadowViewMutationList currentMutations;
  std::swap(currentMutations, filteredMutations);
  filteredMutations.reserve(transaction.containersToInsert.size() * 4);
  for (const auto &sharedTag : transaction.containersToInsert) {
    auto &run = *sharedElements_.at(sharedTag).run;
    run.inserted = true;
    if (!run.clip) {
      filteredMutations.push_back(ShadowViewMutation::CreateMutation(run.container->current));
      filteredMutations.push_back(
          ShadowViewMutation::InsertMutation(surfaceId_, run.container->current, rootChildCount++));
      continue;
    }
    const auto &clip = run.clip->current;
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(clip));
    filteredMutations.push_back(ShadowViewMutation::InsertMutation(surfaceId_, clip, rootChildCount++));
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(run.container->current));
    filteredMutations.push_back(ShadowViewMutation::InsertMutation(clip.tag, run.container->current, 0));
  }
  filteredMutations.insert(filteredMutations.end(), currentMutations.begin(), currentMutations.end());
}

void LayoutAnimationsProxy::finishSharedTransition(
    const SharedTag &sharedTag,
    SharedElement &element,
    TransactionMeta &transaction) const {
  transaction.restoreRequests.push_back({sharedTag, element.run->target});
  removeRun(*element.run, transaction);
  element.run.reset();
}

bool LayoutAnimationsProxy::isSharedContainer(const Tag tag) const {
  return std::ranges::any_of(sharedElements_, [tag](const auto &entry) {
    const auto &run = entry.second.run;
    return run && run->container->current.tag == tag;
  });
}

void LayoutAnimationsProxy::hideInSharedElement(const SharedTag &sharedTag, const std::shared_ptr<LightNode> &node)
    const {
  if (!isLightNodeMapped(node)) {
    return;
  }
  forgetHiddenView(node->current.tag);
  sharedElements_[sharedTag].hiddenViews.push_back(HiddenView{.node = node});
}

bool LayoutAnimationsProxy::showHiddenView(const RestoreRequest &request) const {
  const auto elementIt = sharedElements_.find(request.sharedTag);
  if (elementIt == sharedElements_.end()) {
    return false;
  }
  return std::erase_if(elementIt->second.hiddenViews, [&request](const auto &hiddenView) {
           return hiddenView.node == request.node;
         }) > 0;
}

void LayoutAnimationsProxy::deferRestore(const RestoreRequest &request) const {
  const auto elementIt = sharedElements_.find(request.sharedTag);
  if (elementIt == sharedElements_.end()) {
    return;
  }
  auto &hiddenViews = elementIt->second.hiddenViews;
  const auto hiddenViewIt = std::ranges::find(hiddenViews, request.node, &HiddenView::node);
  if (hiddenViewIt != hiddenViews.end()) {
    hiddenViewIt->restoreDeferred = true;
  }
}

void LayoutAnimationsProxy::forgetHiddenView(const Tag tag) const {
  for (auto &[_, element] : sharedElements_) {
    std::erase_if(element.hiddenViews, [tag](const auto &hiddenView) { return hiddenView.node->current.tag == tag; });
  }
}

std::unordered_set<Tag> LayoutAnimationsProxy::hiddenViewTags() const {
  std::unordered_set<Tag> tags;
  for (const auto &[_, element] : sharedElements_) {
    for (const auto &hiddenView : element.hiddenViews) {
      react_native_assert(isLightNodeMapped(hiddenView.node) && "Hidden view is not mapped");
      tags.insert(hiddenView.node->current.tag);
    }
  }
  return tags;
}

void LayoutAnimationsProxy::queuePendingRestores(TransactionMeta &transaction) const {
  if (sharedElements_.empty()) {
    return;
  }
  auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  const auto &tagToName = sharedTransitionManager_->tagToName_;
  for (const auto &[sharedTag, element] : sharedElements_) {
    for (const auto &[node, restoreDeferred] : element.hiddenViews) {
      const auto nameIt = tagToName.find(node->current.tag);
      if (restoreDeferred || nameIt == tagToName.end() || nameIt->second != sharedTag) {
        transaction.restoreRequests.push_back({sharedTag, node});
      }
    }
  }
}

bool LayoutAnimationsProxy::isInSharedTransition(const std::shared_ptr<LightNode> &node) const {
  const bool isInRun = std::ranges::any_of(sharedElements_, [&node](const auto &entry) {
    const auto &run = entry.second.run;
    return run && (node == run->source || node == run->target);
  });
  return isInRun ||
      (uncommittedScreenPop_ &&
       std::ranges::find(uncommittedScreenPop_->sources, node, &RestoreRequest::node) !=
           uncommittedScreenPop_->sources.end());
}

void LayoutAnimationsProxy::cleanupSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("cleanupSharedTransitions");
  auto &filteredMutations = transaction.filteredMutations;
  for (const auto &request : transaction.restoreRequests) {
    ReanimatedSystraceSection s("Restore tag");
    const auto &node = request.node;
    if (isInSharedTransition(node)) {
      deferRestore(request);
      continue;
    }
    if (!showHiddenView(request) || !isLightNodeMapped(node)) {
      continue;
    }
    resolveLightNodeProps(node);
    const auto &view = viewOnScreen(node);
    const auto parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");
    if (!parent) {
      continue;
    }
    const auto opacity = getViewProps(view).opacity;
    filteredMutations.push_back(ShadowViewMutation::UpdateMutation(
        cloneViewWithoutOpacity(view, propsParserContext),
        cloneViewWithOpacity(view, opacity, propsParserContext),
        parent->current.tag));
  }

  ReanimatedSystraceSection s2("remove shared containers");
  const auto root = lightNodes_.at(surfaceId_);
  for (const auto &container : transaction.containersToRemove) {
    const auto parent = container->parent.lock();
    react_native_assert(parent && "Shared container has no parent");
    // The child of the root is the clip, or the container when it has no clip.
    const auto rootChild = parent == root ? container : parent;
    const auto childIt = std::ranges::find(root->children, rootChild);
    react_native_assert(childIt != root->children.end() && "Shared container is not mounted");
    if (childIt != root->children.end()) {
      const auto index = static_cast<int>(std::distance(root->children.begin(), childIt));
      if (rootChild != container) {
        filteredMutations.push_back(ShadowViewMutation::RemoveMutation(parent->current.tag, container->current, 0));
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(container->current));
      }
      filteredMutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId_, rootChild->current, index));
      filteredMutations.push_back(ShadowViewMutation::DeleteMutation(rootChild->current));
      root->children.erase(childIt);
    }

    unmapLightNode(container);
    unmapLightNode(rootChild);
  }

  std::erase_if(sharedElements_, [](const auto &entry) {
    const auto &element = entry.second;
    return !element.run && element.hiddenViews.empty();
  });
}

// MARK: Position Calculation

// A running layout animation keeps the frame that is on screen in its own record.
// The light node holds the committed layout, which the animation has not reached yet.
const ShadowView &LayoutAnimationsProxy::viewOnScreen(const std::shared_ptr<LightNode> &node) const {
  const auto tag = node->current.tag;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    return it->second.currentView;
  }
  if (const auto it = completedAnimations_.find(tag); it != completedAnimations_.end() && !it->second.shouldRemove) {
    return it->second.animation.currentView;
  }
  return node->current;
}

std::vector<react::Point> LayoutAnimationsProxy::getAbsolutePositionsForRootPathView(
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  std::vector<react::Point> viewsAbsolutePositions;
  auto currentNode = node;
  while (currentNode) {
    react::Point viewPosition;
    const auto &componentName = currentNode->current.componentName;
    react_native_assert(componentName && "Component name is nullptr");
    viewPosition -= scrollContentOffset(currentNode->current);
    const auto &view = useViewsOnScreen ? viewOnScreen(currentNode) : currentNode->current;
    const auto parent = currentNode->parent.lock();
    if (parent && !strcmp(componentName, "RNSScreen") && currentNode->children.size() >= 2) {
      const auto &parentView = useViewsOnScreen ? viewOnScreen(parent) : parent->current;
      const float headerHeight = parentView.layoutMetrics.frame.size.height - view.layoutMetrics.frame.size.height;
      viewPosition.y += headerHeight;
    }
    viewPosition += view.layoutMetrics.frame.origin;
    viewsAbsolutePositions.emplace_back(viewPosition);
    currentNode = parent;
  }
  for (int i = static_cast<int>(viewsAbsolutePositions.size()) - 2; i >= 0; --i) {
    viewsAbsolutePositions[i] += viewsAbsolutePositions[i + 1];
  }
  return viewsAbsolutePositions;
}

react::Point LayoutAnimationsProxy::scrollContentOffset(const ShadowView &view) const {
  if (strcmp(view.componentName, "ScrollView")) {
    return {};
  }
  return std::static_pointer_cast<const ConcreteState<ScrollViewState>>(view.state)->getData().contentOffset;
}

// The ancestors draw the view with the product of their opacities and clip it to the frames of those that clip
// their content. The clip takes the border radius of the outermost ancestor that narrows it and ignores the
// transforms of the ancestors.
void LayoutAnimationsProxy::parseAncestorOpacityAndClip(
    const std::shared_ptr<LightNode> &node,
    const std::vector<react::Point> &absolutePositions,
    const bool useViewsOnScreen,
    Float &opacity,
    AncestorClip &clip) const {
  opacity = 1;
  // The window does not clip anything that is on screen, so it stands for no clip.
  clip = {.frame = windowFrame()};
  auto ancestor = node->parent.lock();
  for (size_t i = 1; ancestor; ++i, ancestor = ancestor->parent.lock()) {
    const auto &view = useViewsOnScreen ? viewOnScreen(ancestor) : ancestor->current;
    const auto &props = getViewProps(view);
    opacity *= props.opacity;
    if (!props.getClipsContentToBounds()) {
      continue;
    }
    // The absolute position of a scroll view is the position of its content.
    const react::Rect frame{
        .origin = absolutePositions[i] + scrollContentOffset(view),
        .size = view.layoutMetrics.frame.size,
    };
    const auto narrowed = react::Rect::intersect(clip.frame, frame);
    if (narrowed != clip.frame) {
      clip = {
          .frame = narrowed,
          .borderRadius = props.borderRadii.all.value_or(ValueUnit(0, UnitType::Point)).value,
      };
    }
  }
}

std::optional<Transform> LayoutAnimationsProxy::parseParentTransforms(
    const std::shared_ptr<LightNode> &node,
    const std::vector<react::Point> &absolutePositions,
    const bool useViewsOnScreen) const {
  std::vector<AncestorTransform> transforms;
  const auto &targetLayoutMetrics = (useViewsOnScreen ? viewOnScreen(node) : node->current).layoutMetrics;
  auto currentNode = node;
  while (currentNode) {
    resolveLightNodeProps(currentNode);
    const auto &view = useViewsOnScreen ? viewOnScreen(currentNode) : currentNode->current;
    const auto &props = getViewProps(view);
    auto origin = props.transformOrigin;
    const auto &viewSize = view.layoutMetrics.frame.size;
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
    transforms.push_back({props.transform, origin, viewSize});
    currentNode = currentNode->parent.lock();
  }

  const auto &targetViewPosition = absolutePositions[0];
  Transform combinedMatrix;
  bool parentHasTransform = false;
  for (int i = static_cast<int>(transforms.size()) - 1; i >= 0; --i) {
    auto &[transform, transformOrigin, ownSize] = transforms[i];
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
    combinedMatrix =
        combinedMatrix * resolveTransform(targetLayoutMetrics.frame.size, ownSize, transform, transformOrigin);
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
// to accept the transform origin as a parameter instead of as a class field,
// and to resolve percent operations with the size of the view that owns them.
react::Transform LayoutAnimationsProxy::resolveTransform(
    const react::Size &originFrameSize,
    const react::Size &ownSize,
    const Transform &transform,
    const TransformOrigin &transformOrigin) const {
  auto transformMatrix = Transform{};
  if (originFrameSize.width == 0 && originFrameSize.height == 0) {
    return transformMatrix;
  }

  if (transform.operations.size() == 1 &&
      transform.operations[0].type == facebook::react::TransformOperationType::Arbitrary) {
    transformMatrix = transform;
  } else {
    for (const auto &operation : transform.operations) {
      transformMatrix = transformMatrix * Transform::FromTransformOperation(operation, ownSize, transform);
    }
  }

  if (transformOrigin.isSet()) {
    std::array<float, 3> translateOffsets =
        getTranslateForTransformOrigin(originFrameSize.width, originFrameSize.height, transformOrigin);
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
