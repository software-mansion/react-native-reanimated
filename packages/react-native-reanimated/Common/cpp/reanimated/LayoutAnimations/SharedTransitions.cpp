#include <folly/dynamic.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/SharedTransitionValuesFactory.h>
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
    auto &[snapshot, parentTag, transform] = transition;
    auto ancestors = collectAncestors(node, useViewsOnScreen);
    auto newTransform = parseParentTransforms(ancestors, absolutePositions);
    const auto &parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");

    int indexNum = static_cast<int>(index);
    transform[indexNum] = std::move(newTransform);
    snapshot[indexNum] = copy;
    parentTag[indexNum] = parent->current.tag;
    collectedTransition.nodes[indexNum] = node;
    collectedTransition.absolutePositions[indexNum] = std::move(absolutePositions);
    collectedTransition.ancestors[indexNum] = std::move(ancestors);

    if (parentTag[BEFORE] && parentTag[AFTER]) {
      transaction.transitions.emplace_back(
          *sharedTag,
          CollectedTransition{
              .transition = transition,
              .nodes = collectedTransition.nodes,
              .absolutePositions = std::move(collectedTransition.absolutePositions),
              .ancestors = std::move(collectedTransition.ancestors)});
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
  const auto sourceScreen =
      topScreen_ && transition_->targetScreen ? findScreenInStackOf(topScreen_, transition_->targetScreen) : nullptr;
  if (!sourceScreen || !visibleScreens_.contains(sourceScreen->current.tag) ||
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
    if (!transition_->sourceScreen || !transition_->targetScreen ||
        transition_->sourceScreen->current.tag == transition_->targetScreen->current.tag || !beforeTopScreen ||
        !isInSubtree(beforeTopScreen, transition_->sourceScreen) || !afterTopScreen ||
        beforeTopScreen == afterTopScreen) {
      transition_->state = TransitionState::CANCELLED;
    } else {
      findSharedElementsOnScreen(beforeTopScreen, BEFORE, transaction);
      findSharedElementsOnScreen(afterTopScreen, AFTER, transaction);
      hideTransitioningViews(BEFORE, transaction, propsParserContext);
      hideTransitioningViews(AFTER, transaction, propsParserContext);

      for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
        placeNatively(collectedTransition, BEFORE);
        placeNatively(collectedTransition, AFTER);
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
        if (isDetached(beforeNode)) {
          cancelSharedTransition(sharedTag, transaction);
          transaction.restoreRequests.push_back({sharedTag, beforeNode});
          transaction.restoreRequests.push_back({sharedTag, afterNode});
          continue;
        }
        warnIfSnapshotIsStale(before, transaction);
        warnIfSnapshotIsStale(after, transaction);

        const auto config = layoutAnimationsManager_->getLayoutAnimationConfig(
            before.tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS);
        const auto &run = startSharedTransitionRun(before, sharedTag, collectedTransition.nodes, true, transaction);
        const auto containerTag = run.container->current.tag;
        before.tag = containerTag;
        after.tag = containerTag;

        startProgressTransition(containerTag, before, after, config);
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

// Called from onTransitionProgress on the UI thread. pullTransaction can run off the UI thread, so it must not call
// worklets.
void LayoutAnimationsProxy::applyProgressAnimations() {
  for (const auto &[_, element] : sharedElements_) {
    if (!element.run || !element.run->gestureDriven) {
      continue;
    }
    const auto tag = element.run->container->current.tag;
    if (hasPendingLayoutAnimation(tag)) {
      continue;
    }
    const auto layoutAnimationIt = layoutAnimations_.find(tag);
    if (layoutAnimationIt == layoutAnimations_.end() ||
        layoutAnimationIt->second.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS) {
      continue;
    }
    const auto &layoutAnimation = layoutAnimationIt->second;
    react_native_assert(layoutAnimation.config && "Progress shared transition without a progress animation");
    if (!layoutAnimation.config) {
      continue;
    }
    auto values =
        SharedTransitionValuesFactory(uiRuntime_).create(layoutAnimation.startView, layoutAnimation.finalView);
    values.setProperty(uiRuntime_, "windowWidth", window_.width);
    values.setProperty(uiRuntime_, "windowHeight", window_.height);
    const auto progressAnimation =
        layoutAnimation.config->toJSValue(uiRuntime_).asObject(uiRuntime_).asFunction(uiRuntime_);
    const auto style = progressAnimation.call(uiRuntime_, values, transition_->progress);
    if (style.isObject()) {
      progressLayoutAnimation(tag, style.asObject(uiRuntime_));
    }
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

SharedTransitionRun &LayoutAnimationsProxy::startSharedTransitionRun(
    const ShadowView &before,
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
    const auto tag = run->container->current.tag;
    if (!hasPendingLayoutAnimation(tag) && !layoutAnimations_.contains(tag)) {
      react_native_assert(completedAnimations_.contains(tag) && "Shared container has no animation");
      transaction.containersToRemove.push_back(run->container);
      run.reset();
    }
  }
  if (!run) {
    run = SharedTransitionRun{.container = createSharedContainer(before, transaction)};
    transaction.containersToInsert.push_back(sharedTag);
  }
  run->source = nodes[BEFORE];
  run->target = nodes[AFTER];
  run->gestureDriven = gestureDriven;
  run->targetDetached = false;
  return *run;
}

std::shared_ptr<LightNode> LayoutAnimationsProxy::createSharedContainer(
    const ShadowView &before,
    TransactionMeta &transaction) const {
  const auto containerTag = allocateContainerTag();
  const auto parent = getOrCreateContainerParent(transaction);
  auto containerView = before;
  containerView.tag = containerTag;
  auto node = std::make_shared<LightNode>();
  node->current = std::move(containerView);
#ifdef ANDROID
  react_native_assert(node->current.props && "Shared container has no props");
  node->accumulatedRawProps = node->current.props->rawProps;
#endif
  node->parent = parent;
  parent->children.push_back(node);
  [[maybe_unused]] const auto [_, inserted] = lightNodes_.emplace(containerTag, node);
  react_native_assert(inserted && "Shared container already exists");
  return node;
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
      placeNatively(collectedTransition, BEFORE);
      placeNatively(collectedTransition, AFTER);
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;
      const auto &transform = transition.transform;
      overrideTransform(before, transform[BEFORE], propsParserContext);
      overrideTransform(after, transform[AFTER], propsParserContext);
      const auto config = layoutAnimationsManager_->getLayoutAnimationConfig(
          before.tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
      const bool sourceDetached = isDetached(collectedTransition.nodes[BEFORE]);
      if (sourceDetached) {
        cancelSharedTransition(sharedTag, transaction);
      }
      if (!config || sourceDetached) {
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
      auto &run = startSharedTransitionRun(before, sharedTag, collectedTransition.nodes, false, transaction);
      const auto containerTag = run.container->current.tag;
      before.tag = containerTag;
      after.tag = containerTag;

      startSharedTransition(containerTag, before, after, config);
      run.targetDetached = isDetached(afterNode);
      if (run.targetDetached) {
        schedulePullOnNextFrame();
      }
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
      if (!hasPendingLayoutAnimation(containerTag) && !layoutAnimations_.contains(containerTag)) {
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
      placeNatively(collectedTransition, AFTER);
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
  if (isGoingForward) {
    return {};
  }
  if (isClosing) {
    const auto closingIt = lightNodes_.find(tag);
    const auto below =
        closingIt != lightNodes_.end() && closingIt->second ? findScreenBelow(closingIt->second) : nullptr;
    if (!below) {
      return {};
    }
    // A dismissal gesture that the user abandons reports its progress back to zero and no cancel.
    const bool reversed = progress <= 0 && ((transition_ && transition_->progress > 0) || uncommittedScreenPop_);
    if (reversed) {
      return onGestureCancel(tag);
    }
    tag = below->current.tag;
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
      sourceScreen = topScreen_ ? findScreenInStackOf(topScreen_, targetIt->second) : nullptr;
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
  if (transition_->state == TransitionState::ACTIVE) {
    applyProgressAnimations();
  }
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

// A source that left the screen before its transition starts, e.g. a sheet dismissed by a swipe, has nothing to fly
// from.
bool LayoutAnimationsProxy::isDetached(const std::shared_ptr<LightNode> &node) const {
#ifdef __APPLE__
  const auto parent = node ? node->parent.lock() : nullptr;
  return parent && nativeViewPlacement_ &&
      nativeViewPlacement_(surfaceId_, node->current.tag, parent->current.tag, false).kind ==
      NativeViewPlacement::Kind::Detached;
#else
  return false;
#endif
}

// A target that is not mounted or presented yet is measured in the shadow tree, which places a presented screen at the
// origin of its stack. The run follows the target once the platform places it, until the transition ends.
void LayoutAnimationsProxy::followDetachedTargets(const PropsParserContext &propsParserContext) const {
  for (auto &[_, element] : sharedElements_) {
    if (!element.run || !element.run->targetDetached) {
      continue;
    }
    auto &run = *element.run;
    const auto containerTag = run.container->current.tag;
    const bool targetMapped = isLightNodeMapped(run.target);
    const bool targetDetached = targetMapped && isDetached(run.target);
    if (targetDetached && (hasPendingLayoutAnimation(containerTag) || layoutAnimations_.contains(containerTag))) {
      schedulePullOnNextFrame();
      continue;
    }
    run.targetDetached = false;
    if (!targetMapped || targetDetached) {
      continue;
    }
    const auto config = layoutAnimationsManager_->getLayoutAnimationConfig(
        run.source->current.tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
    if (!config) {
      continue;
    }
    resolveLightNodeProps(run.target);
    auto after = run.target->current;
    auto absolutePositions = getAbsolutePositionsForRootPathView(run.target, false);
    const auto ancestors = collectAncestors(run.target, false);
    placeNatively(ancestors, absolutePositions, true);
    after.layoutMetrics.frame.origin = absolutePositions[0];
    overrideTransform(after, parseParentTransforms(ancestors, absolutePositions), propsParserContext);
    after.tag = containerTag;
    if (hasPendingLayoutAnimation(containerTag)) {
      updateLayoutAnimationTarget(containerTag, after, config);
      continue;
    }
    const LayoutAnimation *animation = nullptr;
    if (const auto it = layoutAnimations_.find(containerTag); it != layoutAnimations_.end()) {
      animation = &it->second;
    } else if (const auto it = completedAnimations_.find(containerTag); it != completedAnimations_.end()) {
      animation = &it->second.animation;
    }
    if (animation && animation->finalView.layoutMetrics != after.layoutMetrics) {
      startSharedTransition(containerTag, animation->currentView, after, config);
    }
  }
}

Tag LayoutAnimationsProxy::allocateContainerTag() const {
  auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  const auto tag = sharedTransitionManager_->nextContainerTag_;
  sharedTransitionManager_->nextContainerTag_ += 2;
  return tag;
}

std::shared_ptr<LightNode> LayoutAnimationsProxy::getOrCreateContainerParent(TransactionMeta &transaction) const {
#ifdef __APPLE__
  if (setSharedTransitionOverlay_) {
    if (!containerOverlay_) {
      const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
      const auto &descriptor = componentDescriptorRegistry_->at("View");
      ShadowView overlay;
      overlay.componentName = descriptor.getComponentName();
      overlay.componentHandle = descriptor.getComponentHandle();
      overlay.surfaceId = surfaceId_;
      overlay.tag = allocateContainerTag();
      overlay.props =
          descriptor.cloneProps(propsParserContext, nullptr, RawProps(folly::dynamic::object("pointerEvents", "none")));
      overlay.layoutMetrics = lightNodes_.at(surfaceId_)->current.layoutMetrics;
      containerOverlay_ = std::make_shared<LightNode>();
      containerOverlay_->current = std::move(overlay);
      transaction.createsOverlay = true;
    }
    return containerOverlay_;
  }
#endif
  return lightNodes_.at(surfaceId_);
}

int LayoutAnimationsProxy::containerParentChildCount() const {
#ifdef __APPLE__
  if (setSharedTransitionOverlay_) {
    return containerOverlay_ ? static_cast<int>(containerOverlay_->children.size()) : 0;
  }
#endif
  return static_cast<int>(lightNodes_.at(surfaceId_)->children.size());
}

// The container mutations go before the other mutations of the transaction, so they index the children that the
// container parent had at the start of the pull.
void LayoutAnimationsProxy::insertContainers(TransactionMeta &transaction, int containerIndex) const {
  if (transaction.containersToInsert.empty()) {
    return;
  }
  auto &filteredMutations = transaction.filteredMutations;
  ShadowViewMutationList currentMutations;
  std::swap(currentMutations, filteredMutations);
  filteredMutations.reserve(transaction.containersToInsert.size() * 2 + 2);
  const auto parent = getOrCreateContainerParent(transaction);
#ifdef __APPLE__
  if (transaction.createsOverlay) {
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(parent->current));
    // The overlay is never inserted, and a recycled view keeps the props of its previous use until an update.
    const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
    auto recycledView = parent->current;
    recycledView.props =
        componentDescriptorRegistry_->at(parent->current.componentHandle).cloneProps(propsParserContext, nullptr, {});
    recycledView.layoutMetrics = EmptyLayoutMetrics;
    filteredMutations.push_back(ShadowViewMutation::UpdateMutation(recycledView, parent->current, Tag{0}));
    setSharedTransitionOverlay_(surfaceId_, parent->current.tag);
  }
#endif
  for (const auto &sharedTag : transaction.containersToInsert) {
    auto &run = *sharedElements_.at(sharedTag).run;
    run.inserted = true;
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(run.container->current));
    filteredMutations.push_back(
        ShadowViewMutation::InsertMutation(parent->current.tag, run.container->current, containerIndex++));
  }
  filteredMutations.insert(filteredMutations.end(), currentMutations.begin(), currentMutations.end());
}

// A source that left the screen has nothing to fly from, which also ends the run that still flies between the views.
void LayoutAnimationsProxy::cancelSharedTransition(const SharedTag &sharedTag, TransactionMeta &transaction) const {
  const auto elementIt = sharedElements_.find(sharedTag);
  if (elementIt == sharedElements_.end() || !elementIt->second.run) {
    return;
  }
  auto &element = elementIt->second;
  react_native_assert(element.run->inserted && "Cancelled shared container is not inserted");
  const auto containerTag = element.run->container->current.tag;
  transaction.restoreRequests.push_back({sharedTag, element.run->source});
  transaction.restoreRequests.push_back({sharedTag, element.run->target});
  transaction.containersToRemove.push_back(element.run->container);
  element.run.reset();
  cancelLayoutAnimation(containerTag);
}

void LayoutAnimationsProxy::finishSharedTransition(
    const SharedTag &sharedTag,
    SharedElement &element,
    TransactionMeta &transaction) const {
  transaction.restoreRequests.push_back({sharedTag, element.run->target});
#ifdef __APPLE__
  if (element.run->container->parent.lock() == containerOverlay_) {
    transaction.containersOverRestoredTargets.push_back(element.run->container);
    element.run.reset();
    return;
  }
#endif
  transaction.containersToRemove.push_back(element.run->container);
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
  for (const auto &node : transaction.containersToRemove) {
    const auto parent = node->parent.lock();
    const auto childIt = std::ranges::find(parent->children, node);
    react_native_assert(childIt != parent->children.end() && "Shared container is not mounted");
    if (childIt != parent->children.end()) {
      const auto index = static_cast<int>(std::distance(parent->children.begin(), childIt));
      filteredMutations.push_back(ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, index));
      filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
      parent->children.erase(childIt);
    }

    unmapLightNode(node);
  }
#ifdef __APPLE__
  // The overlay is attached to its window after a mount, which misses a commit that the mount forces, such as the
  // snapshot of a dismissed screen, so the overlay stays attached between transitions.
  if (transaction.surfaceDropped && containerOverlay_) {
    setSharedTransitionOverlay_(surfaceId_, std::nullopt);
    filteredMutations.push_back(ShadowViewMutation::DeleteMutation(containerOverlay_->current));
    containerOverlay_.reset();
  }
#endif

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

static react::Point scrollPosition(const ShadowView &view) {
  react::Point position;
  if (!strcmp(view.componentName, "ScrollView")) {
    position -= std::static_pointer_cast<const ConcreteState<ScrollViewState>>(view.state)->getData().contentOffset;
  }
  return position;
}

std::vector<react::Point> LayoutAnimationsProxy::getAbsolutePositionsForRootPathView(
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  std::vector<react::Point> viewsAbsolutePositions;
  auto currentNode = node;
  while (currentNode) {
    const auto &componentName = currentNode->current.componentName;
    react_native_assert(componentName && "Component name is nullptr");
    react::Point viewPosition = scrollPosition(currentNode->current);
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

// UIKit can place a view outside the view of its parent, for example in a presented modal. The view of the first such
// ancestor gives the position of the path below it.
bool LayoutAnimationsProxy::placeNatively(
    const std::vector<Ancestor> &ancestors,
    std::vector<react::Point> &absolutePositions,
    const bool settled) const {
#ifdef __APPLE__
  if (!nativeViewPlacement_) {
    return false;
  }
  for (size_t i = 0; i + 1 < ancestors.size() && i < absolutePositions.size(); ++i) {
    const auto placement = nativeViewPlacement_(surfaceId_, ancestors[i].tag, ancestors[i + 1].tag, settled);
    if (placement.kind == NativeViewPlacement::Kind::Reparented) {
      const auto shift = ancestors[i].scrollPosition + placement.origin - absolutePositions[i];
      absolutePositions.resize(i + 1);
      for (auto &position : absolutePositions) {
        position += shift;
      }
      return true;
    }
  }
#endif
  return false;
}

// Native views do not change during a pull.
void LayoutAnimationsProxy::placeNatively(CollectedTransition &collectedTransition, const BeforeOrAfter index) const {
  const auto &ancestors = collectedTransition.ancestors[index];
  auto &absolutePositions = collectedTransition.absolutePositions[index];
  if (placeNatively(ancestors, absolutePositions, index == AFTER)) {
    collectedTransition.transition.snapshot[index].layoutMetrics.frame.origin = absolutePositions[0];
    collectedTransition.transition.transform[index] = parseParentTransforms(ancestors, absolutePositions);
  }
}

std::vector<Ancestor> LayoutAnimationsProxy::collectAncestors(
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  std::vector<Ancestor> ancestors;
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
    ancestors.push_back(
        {currentNode->current.tag, scrollPosition(currentNode->current), props.transform, origin, viewSize});
    currentNode = currentNode->parent.lock();
  }
  return ancestors;
}

std::optional<Transform> LayoutAnimationsProxy::parseParentTransforms(
    const std::vector<Ancestor> &ancestors,
    const std::vector<react::Point> &absolutePositions) const {
  const auto &targetSize = ancestors[0].ownSize;
  const auto &targetViewPosition = absolutePositions[0];
  Transform combinedMatrix;
  bool parentHasTransform = false;
  for (int i = static_cast<int>(absolutePositions.size()) - 1; i >= 0; --i) {
    const auto &ancestor = ancestors[i];
    if (ancestor.transform.operations.empty()) {
      continue;
    } else if (i > 0) {
      parentHasTransform = true;
    }
    if (i == 0 && !parentHasTransform) {
      // If only target view has transform, let's skip it, to matrix decomposition in JS
      break;
    }
    auto transformOrigin = ancestor.origin;
    transformOrigin.xy[0].value -= targetViewPosition.x - absolutePositions[i].x;
    transformOrigin.xy[1].value -= targetViewPosition.y - absolutePositions[i].y;
    combinedMatrix =
        combinedMatrix * resolveTransform(targetSize, ancestor.ownSize, ancestor.transform, transformOrigin);
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
