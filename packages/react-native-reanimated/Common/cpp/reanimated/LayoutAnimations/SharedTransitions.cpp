#include <folly/dynamic.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/SharedTransitionValuesFactory.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <algorithm>
#include <array>
#include <iterator>
#include <ranges>
#include <unordered_set>
#include <utility>

namespace reanimated {

namespace {
// A screen that UIKit presents enters the window in less time than this.
constexpr auto kTargetWindowWait = std::chrono::milliseconds(500);
} // namespace

#ifdef ANDROID
namespace {
// The style props that SharedTransitionValuesFactory animates.
constexpr std::array kAnimatedStyleProps{
    "opacity",
    "backgroundColor",
    "transformOrigin",
    "boxShadow",
    "shadowColor",
    "shadowOffset",
    "shadowOpacity",
    "shadowRadius",
    "elevation",
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "borderTopStartRadius",
    "borderTopEndRadius",
    "borderBottomStartRadius",
    "borderBottomEndRadius",
    "borderEndEndRadius",
    "borderEndStartRadius",
    "borderStartEndRadius",
    "borderStartStartRadius",
    "borderWidth",
    "borderLeftWidth",
    "borderRightWidth",
    "borderTopWidth",
    "borderBottomWidth",
    "borderColor",
    "borderLeftColor",
    "borderRightColor",
    "borderTopColor",
    "borderBottomColor",
};
} // namespace
#endif

namespace {
double fadeLength(const ContentFade &contentFade) {
  const auto &[from, to] = contentFade.range;
  return to < from ? contentFade.options.fadeOutEnd : 1;
}

bool isQueuedOrRunning(const LayoutAnimationPhase phase) {
  return phase == LayoutAnimationPhase::QUEUED || phase == LayoutAnimationPhase::RUNNING;
}
} // namespace

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

// The boundaries of a screen below the top one are inactive. The platform shows only one tab of a tab navigator.
std::shared_ptr<LightNode> LayoutAnimationsProxy::findBoundaryGuess(const std::shared_ptr<LightNode> &node) const {
  std::shared_ptr<LightNode> result = nullptr;

  if (node->isExiting()) {
    return result;
  }
  if (isSETBoundary(node) && !isOffWindow(node)) {
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

// A back gesture shows the boundary that was on top when the screen was covered, for example the page of a pager.
std::shared_ptr<LightNode> LayoutAnimationsProxy::findRevealedBoundary(const std::shared_ptr<LightNode> &screen) const {
  if (const auto it = coveredTopBoundaries_.find(screen->current.tag); it != coveredTopBoundaries_.end()) {
    const auto boundary = it->second.lock();
    if (isLightNodeMapped(boundary) && !boundary->isExiting() && isInSubtree(boundary, screen) &&
        !isOffWindow(boundary)) {
      return boundary;
    }
  }
  return findBoundaryGuess(screen);
}

void LayoutAnimationsProxy::rememberCoveredTopBoundary(
    const std::shared_ptr<LightNode> &beforeTopScreen,
    const std::shared_ptr<LightNode> &afterTopScreen) const {
  if (beforeTopScreen == afterTopScreen || !isLightNodeMapped(beforeTopScreen)) {
    return;
  }
  for (auto screen = findParentRNSScreen(beforeTopScreen); screen; screen = findParentRNSScreen(screen)) {
    if (afterTopScreen && isInSubtree(afterTopScreen, screen)) {
      return;
    }
    coveredTopBoundaries_[screen->current.tag] = beforeTopScreen;
  }
}

// Without sharedTags, collects the shared elements of the whole screen.
void LayoutAnimationsProxy::findSharedElements(
    const std::shared_ptr<LightNode> &screen,
    BeforeOrAfter index,
    const std::optional<std::unordered_set<SharedTag>> &sharedTags,
    TransactionMeta &transaction) const {
  if (!sharedTags) {
    findSharedElementsOnScreen(screen, index, transaction);
  } else if (!sharedTags->empty()) {
    findSharedElementsWithTags(screen, index, *sharedTags, transaction);
  }
}

void LayoutAnimationsProxy::findSharedElementsOnScreen(
    const std::shared_ptr<LightNode> &node,
    BeforeOrAfter index,
    TransactionMeta &transaction) const {
  if (node->isExiting()) {
    return;
  }
  if (const auto sharedTag = findSharedTag(node->current)) {
    collectSharedElement(node, *sharedTag, index, transaction);
  }
  for (auto &child : node->children) {
    findSharedElementsOnScreen(child, index, transaction);
  }
}

// Collects the same views, in the same order, as findSharedElementsOnScreen, but only for sharedTags.
void LayoutAnimationsProxy::findSharedElementsWithTags(
    const std::shared_ptr<LightNode> &screen,
    BeforeOrAfter index,
    const std::unordered_set<SharedTag> &sharedTags,
    TransactionMeta &transaction) const {
  struct Element {
    std::vector<int> positions;
    std::shared_ptr<LightNode> node;
    SharedTag sharedTag;
  };
  std::vector<Element> elements;
  {
    auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
    const auto &nameToTags = sharedTransitionManager_->nameToTags_;
    for (const auto &sharedTag : sharedTags) {
      const auto tagsIt = nameToTags.find(sharedTag);
      if (tagsIt == nameToTags.end()) {
        continue;
      }
      for (const auto tag : tagsIt->second) {
        const auto nodeIt = lightNodes_.find(tag);
        if (nodeIt == lightNodes_.end() || !isViewKind(nodeIt->second->current)) {
          continue;
        }
        if (auto positions = childPositionsFrom(screen, nodeIt->second)) {
          elements.push_back({std::move(*positions), nodeIt->second, sharedTag});
        }
      }
    }
  }
  std::ranges::sort(elements, std::ranges::less{}, &Element::positions);
  for (const auto &[_, node, sharedTag] : elements) {
    collectSharedElement(node, sharedTag, index, transaction);
  }
}

void LayoutAnimationsProxy::collectSharedElement(
    const std::shared_ptr<LightNode> &node,
    const SharedTag &sharedTag,
    BeforeOrAfter index,
    TransactionMeta &transaction) const {
  if (const auto staleTag = staleSynchronousProps_.find(node, LayoutAnimationType::SHARED_ELEMENT_TRANSITION)) {
    transaction.staleSnapshots[node->current.tag] = *staleTag;
  }
  resolveLightNodeProps(node);
  const bool useViewsOnScreen = index == BEFORE;
  ShadowView copy;
  std::optional<Transform> newTransform;
  std::vector<react::Point> absolutePositions;
  std::vector<Ancestor> ancestors;
  const auto *carried =
      useViewsOnScreen && node->placement() == CarrierPlacement::AT_ROOT ? runOfCarrier(node) : nullptr;
  if (carried) {
    copy = carrierViewOnScreen(*carried);
  } else {
    copy = useViewsOnScreen ? viewOnScreen(node) : node->current;
    absolutePositions = getAbsolutePositionsForRootPathView(node, useViewsOnScreen);
    copy.layoutMetrics.frame.origin = absolutePositions[0];
    ancestors = collectAncestors(node, useViewsOnScreen);
    newTransform = parseParentTransforms(ancestors, absolutePositions);
  }

  auto &collectedTransition = transaction.transitionMap[sharedTag];
  auto &transition = collectedTransition.transition;
  auto &[snapshot, parentTag, transform] = transition;
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
    transaction.transitions.emplace_back(sharedTag, collectedTransition);
  } else if (parentTag[AFTER]) {
    transaction.restoreRequests.push_back({sharedTag, node});
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
    if (!settleUncommittedScreenPop(transaction, propsParserContext)) {
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

bool LayoutAnimationsProxy::settleUncommittedScreenPop(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  uncommittedScreenPop_->cancelled |= transaction.surfaceDropped;
  if (uncommittedScreenPop_->sourceScreen && !uncommittedScreenPop_->cancelled) {
    return false;
  }
  if (uncommittedScreenPop_->sourceScreen) {
    restoreCancelledProgressTransition(uncommittedScreenPop_->endpoints, transaction, propsParserContext);
  }
  for (auto &config : uncommittedScreenPop_->progressCallbacks) {
    scheduleSharedTransitionCallback(std::move(config), !uncommittedScreenPop_->cancelled);
  }
  topScreen_ = findActiveBoundary(lightNodes_.at(surfaceId_));
  uncommittedScreenPop_.reset();
  return true;
}

void LayoutAnimationsProxy::restoreCancelledProgressTransition(
    const std::vector<ProgressTransitionEndpoint> &endpoints,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  for (const auto &[sharedTag, source, target, targetWasHidden] : endpoints) {
    const bool sourceMapped = isLightNodeMapped(source);
    if (sourceMapped) {
      transaction.restoreRequests.push_back({sharedTag, source});
    }
    const bool sourceSurvives = sourceMapped && source->presence() != ReactPresence::REMOVED && !source->isExiting();
    if (!targetWasHidden || !sourceSurvives || findSharedTag(source->current) != sharedTag) {
      transaction.restoreRequests.push_back({sharedTag, target});
      continue;
    }
    if (!isLightNodeMapped(target) || target->presence() == ReactPresence::REMOVED || target->isExiting() ||
        target->isCarrier() || isInSharedTransition(target) || findSharedTag(target->current) != sharedTag) {
      continue;
    }
    std::erase_if(transaction.restoreRequests, [&](const RestoreRequest &request) {
      return request.sharedTag == sharedTag && withShownEndpoint(request).node == target;
    });
    resolveLightNodeProps(target);
    const auto parent = target->parent.lock();
    if (!parent) {
      continue;
    }
    const auto &view = viewOnScreen(target);
    hideInSharedElement(sharedTag, target);
    transaction.filteredMutations.push_back(createPropsUpdate(
        view, cloneViewWithoutOpacity(view, propsParserContext), parent->current.tag, propsParserContext));
  }
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
    const auto afterTopScreen = findRevealedBoundary(transition_->targetScreen);
    if (!transition_->sourceScreen || !transition_->targetScreen ||
        transition_->sourceScreen->current.tag == transition_->targetScreen->current.tag || !beforeTopScreen ||
        !isInSubtree(beforeTopScreen, transition_->sourceScreen) || !afterTopScreen ||
        beforeTopScreen == afterTopScreen) {
      transition_->state = TransitionState::CANCELLED;
    } else {
      findSharedElementsOnScreen(beforeTopScreen, BEFORE, transaction);
      findSharedElementsOnScreen(afterTopScreen, AFTER, transaction);

      filterSharedTransitionStarts(SharedTransitionDriver::GESTURE, transaction, propsParserContext);
      const auto hiddenBefore = hiddenViewTags();
      for (const auto &[sharedTag, collectedTransition] : transaction.transitions) {
        const auto &[source, target] = collectedTransition.nodes;
        if (source && target) {
          transition_->endpoints.push_back(
              {sharedTag, source, target, hiddenBefore.contains(target->current.tag) || target->isCarrier()});
        }
      }

      adjustForNativePlacement(transaction.transitions);
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
        warnIfSnapshotIsStale(before, transaction);
        warnIfSnapshotIsStale(after, transaction);

        const auto config = layoutAnimationsManager_->getLayoutAnimationConfig(
            before.tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS);
        const auto sharedTransitionConfig = layoutAnimationsManager_->getSharedTransitionConfig(before.tag);
        auto &run = startSharedTransitionRun(
            before,
            sharedTag,
            collectedTransition.nodes,
            config,
            SharedTransitionDriver::GESTURE,
            sharedTransitionConfig ? sharedTransitionConfig->contentFade : std::nullopt,
            sharedTransitionConfig ? sharedTransitionConfig->callback : nullptr,
            transaction,
            propsParserContext);
        restartContentFade(run);

        const auto target = targetInCarrierSpace(run, after, propsParserContext);
        startProgressTransition(
            run.carrier,
            run.carrierStartView,
            asCarrierView(target, run.carrier, propsParserContext),
            ownCarrierView(target, run.carrier, propsParserContext).props,
            config);
      }
      hideTransitioningViews(BEFORE, transaction, propsParserContext);
      hideTransitioningViews(AFTER, transaction, propsParserContext);
    }
  }

  if (transition_->state == TransitionState::START) {
    transition_->state = transition_->progress == 1 ? TransitionState::END : TransitionState::ACTIVE;
  }
  if (transition_->state == TransitionState::END || transition_->state == TransitionState::CANCELLED) {
    auto progressCallbacks = std::move(transition_->progressCallbacks);
    for (auto &run : activeSharedTransitionRuns()) {
      if (run.driver == SharedTransitionDriver::GESTURE && run.callback) {
        progressCallbacks.push_back(std::exchange(run.callback, nullptr));
      }
    }
    for (auto &[_, run] : sharedTransitionRuns_) {
      if (run.lifecycle == SharedTransitionLifecycle::ACTIVE && run.driver == SharedTransitionDriver::GESTURE) {
        finishSharedTransition(run, transaction, propsParserContext, transition_->state == TransitionState::END);
      }
    }
    if (transition_->state == TransitionState::END) {
      react_native_assert(!uncommittedScreenPop_ && "Previous screen pop not settled");
      react_native_assert(transition_->sourceScreen && "Shared transition source not found");
      if (transition_->sourceScreen) {
        uncommittedScreenPop_ = UncommittedScreenPop{
            transition_->sourceScreen, std::move(transition_->endpoints), std::move(progressCallbacks)};
      }
    } else {
      for (auto &config : progressCallbacks) {
        scheduleSharedTransitionCallback(std::move(config), false);
      }
      topScreen_ = findActiveBoundary(lightNodes_.at(surfaceId_));
      restoreCancelledProgressTransition(transition_->endpoints, transaction, propsParserContext);
    }
    transition_.reset();
  }
}

// Called from onTransitionProgress on the UI thread. pullTransaction can run off the UI thread, so it must not call
// worklets.
void LayoutAnimationsProxy::applyProgressAnimations() {
  for (const auto &run : activeSharedTransitionRuns()) {
    if (run.driver != SharedTransitionDriver::GESTURE) {
      continue;
    }
    const auto tag = run.carrier->current.tag;
    if (layoutAnimationPhase(tag) == LayoutAnimationPhase::QUEUED) {
      continue;
    }
    const auto layoutAnimationIt = layoutAnimations_.find(tag);
    if (layoutAnimationIt == layoutAnimations_.end() ||
        layoutAnimationIt->second.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS) {
      continue;
    }
    auto &layoutAnimation = layoutAnimationIt->second;
    if (const auto &contentFade = run.contentFade) {
      const auto &[from, to] = contentFade->range;
      const auto fadeProgress = std::clamp(transition_->progress / fadeLength(*contentFade), 0.0, 1.0);
      layoutAnimation.contentOpacity = from + fadeProgress * (to - from);
    }
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
    auto style = jsi::Value::undefined();
    LayoutAnimationsManager::runGuardedOnUIRuntime(uiRuntime_, "progressAnimation", [&](jsi::Runtime &rt) {
      style = progressAnimation.call(rt, values, transition_->progress);
    });
    if (style.isObject()) {
      progressLayoutAnimation(tag, style.asObject(uiRuntime_));
    }
  }
}

void LayoutAnimationsProxy::finishCallback(SharedTransitionRun &run, const bool finished) const {
  if (auto callback = std::exchange(run.callback, nullptr)) {
    scheduleSharedTransitionCallback(std::move(callback), finished);
  }
}

void LayoutAnimationsProxy::scheduleSharedTransitionCallback(
    std::shared_ptr<Serializable> callback,
    const bool finished) const {
  scheduleOnNextUIFrame_([weakRuntime = uiRuntimeWeak_, callback = std::move(callback), finished]() {
    const auto runtime = weakRuntime.lock();
    if (!runtime) {
      return;
    }
    auto &uiRuntime = getJSIRuntimeFromWorkletRuntime(runtime);
    LayoutAnimationsManager::runGuardedOnUIRuntime(uiRuntime, "sharedTransitionCallback", [&](jsi::Runtime &rt) {
      callback->toJSValue(rt).asObject(rt).asFunction(rt).call(rt, finished);
    });
  });
}

void LayoutAnimationsProxy::skipSharedTransition(
    const SharedTag &sharedTag,
    const CollectedTransition &collected,
    const SharedTransitionDriver driver,
    std::shared_ptr<Serializable> callback,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  endSharedTransitionOf(sharedTag, transaction, propsParserContext);
  for (const auto &node : collected.nodes) {
    if (node) {
      if (node->isCarrier()) {
        runOfCarrier(node)->restoreCarrierOnFinish = true;
      } else {
        transaction.restoreRequests.push_back({sharedTag, node});
      }
    }
  }
  if (!callback) {
    return;
  }
  if (driver == SharedTransitionDriver::GESTURE) {
    react_native_assert(transition_ && "Skipped gesture has no transition");
    transition_->progressCallbacks.push_back(std::move(callback));
  } else {
    scheduleSharedTransitionCallback(std::move(callback), true);
  }
}

// On Android, a layout root other than the surface root shows its children at its own origin, for example in the
// window of a Modal.
bool LayoutAnimationsProxy::isLayoutRoot([[maybe_unused]] const std::shared_ptr<LightNode> &node) const {
#ifdef ANDROID
  return node->current.tag != surfaceId_ && node->current.traits.check(ShadowNodeTraits::Trait::RootNodeKind);
#else
  return false;
#endif
}

// A run moves its carrier in one layout root, so a carrier at the root stays in the layout root of its start.
std::shared_ptr<LightNode> LayoutAnimationsProxy::layoutRootOf(const std::shared_ptr<LightNode> &node) const {
  auto current = node;
  while (current->placement() != CarrierPlacement::AT_ROOT) {
    auto parent = current->parent.lock();
    if (!parent) {
      return lightNodes_.at(surfaceId_);
    }
    if (isLayoutRoot(parent)) {
      return parent;
    }
    current = parent;
  }
  return carrierPlacements_.hostOf(current);
}

// A run cannot leave its layout root, so a view hidden in another layout root stays hidden only when a view of its
// shared tag is in the same layout root.
bool LayoutAnimationsProxy::hasSharedViewInLayoutRoot(
    const SharedTag &sharedTag,
    const std::shared_ptr<LightNode> &node,
    const std::unordered_map<Tag, SharedTag> &tagToName,
    std::unordered_map<SharedTag, std::vector<Tag>> &tagsBySharedTag) const {
  const auto layoutRoot = layoutRootOf(node);
  if (layoutRoot->current.tag == surfaceId_) {
    return true;
  }
  if (tagsBySharedTag.empty()) {
    for (const auto &[tag, name] : tagToName) {
      tagsBySharedTag[name].push_back(tag);
    }
  }
  const auto tagsIt = tagsBySharedTag.find(sharedTag);
  if (tagsIt == tagsBySharedTag.end()) {
    return false;
  }
  return std::ranges::any_of(tagsIt->second, [&](const Tag tag) {
    const auto nodeIt = lightNodes_.find(tag);
    return tag != node->current.tag && nodeIt != lightNodes_.end() && nodeIt->second && !nodeIt->second->isExiting() &&
        layoutRootOf(nodeIt->second) == layoutRoot;
  });
}

void LayoutAnimationsProxy::filterSharedTransitionStarts(
    const SharedTransitionDriver driver,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  std::erase_if(transaction.transitions, [&](const auto &entry) {
    const auto &[sharedTag, collected] = entry;
    const auto sourceTag = collected.transition.snapshot[BEFORE].tag;
    const auto config = layoutAnimationsManager_->getSharedTransitionConfig(sourceTag);
    const auto &source = collected.nodes[BEFORE];
    const auto &target = collected.nodes[AFTER];
    // The carrier of a run shows its target until it lands. A held start that goes back to its source ends.
    const auto *activeRun = activeSharedTransitionRun(sharedTag);
    const bool reversesHeldStart = activeRun && activeRun->source == target && activeRun->holdsStart() &&
        hasPendingLayoutAnimation(activeRun->carrier->current.tag);
    const bool continuesRun = activeRun && activeRun->target == source && !reversesHeldStart;
    const bool sourceOffWindow = !continuesRun && isOffWindow(source);
    if (config && !sourceOffWindow && !isInOtherWindow(target) && layoutRootOf(source) == layoutRootOf(target)) {
      return false;
    }
    skipSharedTransition(
        sharedTag, collected, driver, config ? config->callback : nullptr, transaction, propsParserContext);
    return true;
  });
}

// A built-in timed transition aims at the target as it is now. A commit or a synchronous update can move the target.
bool LayoutAnimationsProxy::followSharedTransitionTargets(
    const PropsParserContext &propsParserContext,
    const bool onlyPlacedNatively) const {
  bool moved = false;
  for (auto &run : activeSharedTransitionRuns()) {
    if (!onlyPlacedNatively || run.targetPlacedNatively.value_or(true) || run.targetOffWindow) {
      moved = followSharedTransitionTarget(run, propsParserContext) || moved;
    }
  }
  return moved;
}

bool LayoutAnimationsProxy::followSharedTransitionTarget(
    SharedTransitionRun &run,
    const PropsParserContext &propsParserContext) const {
  auto *animation = liveGeometryAnimation(run);
  if (!animation || !hasLiveTarget(run)) {
    return false;
  }
  bool placedNatively = false;
  const auto target =
      targetInCarrierSpace(run, targetOnScreen(run, propsParserContext, placedNatively), propsParserContext);
  run.targetPlacedNatively = placedNatively;
  const auto &finalView = animation->finalView;
  if (finalView.layoutMetrics == target.layoutMetrics &&
      getViewProps(finalView).transform == getViewProps(target).transform &&
      getViewProps(finalView).transformOrigin == getViewProps(target).transformOrigin) {
    return false;
  }
  animation->finalView = withGeometryOf(finalView, target, propsParserContext);
  if (animation->geometryProgress) {
    writeSharedTransitionGeometry(run.carrier->current.tag, *animation);
  }
  return true;
}

void LayoutAnimationsProxy::followTargetsPlacedNatively() const {
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
    if (followSharedTransitionTargets(propsParserContext, true)) {
      schedulePullOnNextFrame();
    }
  }
}

// A completed carrier that waits to land follows its target too.
LayoutAnimation *LayoutAnimationsProxy::liveGeometryAnimation(const SharedTransitionRun &run) const {
  const auto tag = run.carrier->current.tag;
  if (run.driver != SharedTransitionDriver::TIME || layoutAnimationPhase(tag) == LayoutAnimationPhase::QUEUED) {
    return nullptr;
  }
  LayoutAnimation *animation = nullptr;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    animation = &it->second;
  } else if (const auto it = completedAnimations_.find(tag);
             it != completedAnimations_.end() && !it->second.shouldRemove) {
    animation = &it->second.animation;
  }
  return animation && (animation->geometryProgress || run.followsTarget) ? animation : nullptr;
}

// The platform gives a target that is not in its window yet its frame in later commits. A run that follows its target
// takes that frame without a restart.
bool LayoutAnimationsProxy::followsWithoutRestart(const SharedTransitionRun &run, const ShadowView &carrierTarget)
    const {
  return run.followsTarget && run.targetOffWindow &&
      !SharedTransitionValuesFactory::hasAnimatedChanges(
             getViewProps(carrierAnimation(run).finalView), getViewProps(carrierTarget), false);
}

// A built-in run reads the props of its target and of the parents of its target in each frame.
std::unordered_set<Tag> LayoutAnimationsProxy::tagsFollowedBySharedTransitions() const {
  std::unordered_set<Tag> tags;
  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    for (const auto &run : activeSharedTransitionRuns()) {
      if (run.driver != SharedTransitionDriver::TIME || !run.followsTarget || !hasLiveTarget(run)) {
        continue;
      }
      for (auto node = run.target; node; node = node->parent.lock()) {
        tags.insert(node->current.tag);
      }
    }
  }
  return tags;
}

// A carrier shows the frames of its own run, so a run that aims at a carrier does not follow it.
bool LayoutAnimationsProxy::hasLiveTarget(const SharedTransitionRun &run) const {
  return isLightNodeMapped(run.target) && !run.target->isExiting() && !run.target->isCarrier();
}

ShadowView LayoutAnimationsProxy::withGeometryOf(
    const ShadowView &view,
    const ShadowView &target,
    const PropsParserContext &propsParserContext) const {
  auto result = view;
  result.layoutMetrics = target.layoutMetrics;
#ifdef ANDROID
  auto rawProps = view.props->rawProps;
  rawProps["transform"] = target.props->rawProps.getDefault("transform", nullptr);
  rawProps["transformOrigin"] = target.props->rawProps.getDefault("transformOrigin", nullptr);
  result.props = componentDescriptorRegistry_->at(view.componentHandle)
                     .cloneProps(propsParserContext, view.props, RawProps(std::move(rawProps)));
#else
  result.props = componentDescriptorRegistry_->at(view.componentHandle).cloneProps(propsParserContext, view.props, {});
  auto viewProps = std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(result.props));
  viewProps->transform = getViewProps(target).transform;
  viewProps->transformOrigin = getViewProps(target).transformOrigin;
#endif
  return result;
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

// The view that gave the config of a run can release its config or move to another shared tag.
std::optional<SharedTransitionConfig> LayoutAnimationsProxy::configOfSource(const SharedTransitionRun &run) const {
  const auto &source = run.configSource;
  if (!isLightNodeMapped(source) || findSharedTag(source->current) != run.sharedTag) {
    return std::nullopt;
  }
  return layoutAnimationsManager_->getSharedTransitionConfig(source->current.tag);
}

SharedTransitionRun &LayoutAnimationsProxy::startSharedTransitionRun(
    const ShadowView &before,
    const SharedTag &sharedTag,
    const std::array<std::shared_ptr<LightNode>, 2> &nodes,
    const std::shared_ptr<Serializable> &config,
    const SharedTransitionDriver driver,
    const std::optional<SharedTransitionContentFade> &contentFade,
    std::shared_ptr<Serializable> callback,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  auto *run = activeSharedTransitionRun(sharedTag);
  if (run) {
    finishCallback(*run, false);
    const auto &oldTarget = run->target;
    if (oldTarget != nodes[BEFORE] && oldTarget != nodes[AFTER]) {
      transaction.restoreRequests.push_back({sharedTag, oldTarget});
    }
    const auto tag = run->carrier->current.tag;
    const auto phase = layoutAnimationPhase(tag);
    const bool carrierChangedTag =
        run->carrier->presence() != ReactPresence::REMOVED && findSharedTag(run->carrier->current) != sharedTag;
    const bool waitsToLand = phase == LayoutAnimationPhase::ENDED &&
        (run->carrier->presence() == ReactPresence::REMOVED || landsWithOtherRuns(*run));
    // A carrier stays in its layout root, so the run of another layout root needs a new carrier.
    const bool carrierInOtherLayoutRoot = layoutRootOf(run->carrier) != layoutRootOf(nodes[AFTER]);
    if ((!isQueuedOrRunning(phase) && !waitsToLand && !hasUnqueuedCarrierFrame(tag)) || carrierChangedTag ||
        carrierInOtherLayoutRoot) {
      react_native_assert(phase != LayoutAnimationPhase::NONE && "Shared carrier has no animation");
      if (hasUnqueuedCarrierFrame(tag)) {
        retireSharedTransition(*run);
      } else {
        finishNestedSharedTransitions(run->carrier, transaction, propsParserContext, false);
        if (run->lifecycle == SharedTransitionLifecycle::ACTIVE) {
          attachCarrier(*run, transaction.filteredMutations, propsParserContext);
        }
        run->lifecycle = SharedTransitionLifecycle::FINISHED;
      }
      run = nullptr;
    }
  }
  if (!run) {
    const auto &carrier = nodes[BEFORE];
    // A view carries one run. Its shared tag can change while it carries the run of the old tag.
    // On Android, a frame of the old run can still be outside the mount queue here.
    if (auto *carried = carrier->isCarrier() ? runOfCarrier(carrier) : nullptr) {
      finishSharedTransition(*carried, transaction, propsParserContext);
    }
    react_native_assert(!carrier->isCarrier() && "A view carries one run");
    react_native_assert(!activeSharedTransitionRun(sharedTag) && "Shared tag already has an active run");
    run = &sharedTransitionRuns_
               .insert_or_assign(carrier->current.tag, SharedTransitionRun{.sharedTag = sharedTag, .carrier = carrier})
               .first->second;
    if (contentFade) {
      run->contentFade = ContentFade{.options = *contentFade, .range = {1, 1}};
    }
    const bool nested = keepsNesting(carrier, nodes[AFTER]);
    detachCarrier(
        *run,
        carrierViewWithStyleOf(nested ? inParentSpace(before, carrier) : before, carrier, propsParserContext),
        nested,
        transaction,
        propsParserContext);
  }
  run->source = nodes[BEFORE];
  run->target = nodes[AFTER];
  run->config = config;
  run->configSource = nodes[BEFORE];
  run->configFollowsTarget = false;
  run->followsTarget = false;
  run->callback = std::move(callback);
  run->driver = driver;
  run->targetOffWindow = false;
  if (run->carrier->placement() == CarrierPlacement::NESTED && !keepsNesting(run->carrier, run->target)) {
    moveNestedCarrierToRoot(*run, transaction.filteredMutations, propsParserContext);
  }
  return *run;
}

// The view at one end of the animation of the carrier. The carrier keeps its own state and event
// emitter, so that an image keeps its image request and events go to the component that owns the
// view. The props of another component type are not valid for the view of the carrier, so then
// only the frame comes from the other view.
ShadowView LayoutAnimationsProxy::asCarrierView(
    const ShadowView &view,
    const std::shared_ptr<LightNode> &carrier,
    const PropsParserContext &propsParserContext) const {
  react_native_assert(
      view.componentHandle == carrier->current.componentHandle &&
      "Shared element transitions require matching native view types");
  if (view.componentHandle != carrier->current.componentHandle) {
    return ownCarrierView(view, carrier, propsParserContext);
  }
  resolveLightNodeProps(carrier);
  auto carrierView = carrier->current;
  carrierView.layoutMetrics = view.layoutMetrics;
  carrierView.props = view.props;
  return carrierView;
}

bool LayoutAnimationsProxy::targetEndChanged(const SharedTransitionRun &run, const ShadowView &carrierTarget) const {
  const auto &animation = carrierAnimation(run);
  const auto &previousTarget = animation.finalView;
  const bool followsGeometry = animation.geometryProgress.has_value();
  if (previousTarget.layoutMetrics != carrierTarget.layoutMetrics &&
      !(followsGeometry && completedAnimations_.contains(run.carrier->current.tag))) {
    return true;
  }
  return SharedTransitionValuesFactory::hasAnimatedChanges(
             getViewProps(previousTarget), getViewProps(carrierTarget), !followsGeometry) &&
      waitsForCoveringRun(run, viewsHiddenByContinuingRuns());
}

// The carrier shows its own props, so that its content, for example a video player or an image
// source, does not change during the run. Only the frame and the animated values come from the
// other view.
ShadowView LayoutAnimationsProxy::ownCarrierView(
    const ShadowView &view,
    const std::shared_ptr<LightNode> &carrier,
    const PropsParserContext &propsParserContext) const {
  resolveLightNodeProps(carrier);
  auto carrierView = carrier->current;
  carrierView.layoutMetrics = view.layoutMetrics;
#ifdef ANDROID
  auto rawProps = carrierView.props->rawProps;
  rawProps["transform"] = view.props->rawProps.getDefault("transform", nullptr);
  carrierView.props = componentDescriptorRegistry_->at(carrierView.componentHandle)
                          .cloneProps(propsParserContext, carrierView.props, RawProps(std::move(rawProps)));
#else
  overrideTransform(carrierView, getViewProps(view).transform, propsParserContext);
#endif
  return carrierView;
}

ShadowView LayoutAnimationsProxy::carrierViewWithStyleOf(
    const ShadowView &source,
    const std::shared_ptr<LightNode> &carrier,
    const PropsParserContext &propsParserContext) const {
  auto startView = ownCarrierView(source, carrier, propsParserContext);
  if (source.componentHandle != startView.componentHandle) {
    return startView;
  }
#ifdef ANDROID
  const auto &sourceRawProps = source.props->rawProps;
  const auto &ownRawProps = startView.props->rawProps;
  auto rawProps = ownRawProps;
  for (const auto *name : kAnimatedStyleProps) {
    if (sourceRawProps.count(name) > 0) {
      rawProps[name] = sourceRawProps[name];
    } else if (ownRawProps.count(name) > 0) {
      rawProps[name] = nullptr;
    }
  }
  startView.props = componentDescriptorRegistry_->at(startView.componentHandle)
                        .cloneProps(propsParserContext, startView.props, RawProps(std::move(rawProps)));
#else
  auto props =
      componentDescriptorRegistry_->at(startView.componentHandle).cloneProps(propsParserContext, startView.props, {});
  auto &viewProps = *std::const_pointer_cast<ViewProps>(std::static_pointer_cast<const ViewProps>(props));
  const auto &sourceProps = getViewProps(source);
  viewProps.opacity = sourceProps.opacity;
  viewProps.backgroundColor = sourceProps.backgroundColor;
  viewProps.transformOrigin = sourceProps.transformOrigin;
  viewProps.boxShadow = sourceProps.boxShadow;
  viewProps.shadowColor = sourceProps.shadowColor;
  viewProps.shadowOffset = sourceProps.shadowOffset;
  viewProps.shadowOpacity = sourceProps.shadowOpacity;
  viewProps.shadowRadius = sourceProps.shadowRadius;
  viewProps.borderRadii = sourceProps.borderRadii;
  viewProps.borderColors = sourceProps.borderColors;
  for (const auto edge :
       {facebook::yoga::Edge::Left,
        facebook::yoga::Edge::Top,
        facebook::yoga::Edge::Right,
        facebook::yoga::Edge::Bottom,
        facebook::yoga::Edge::All}) {
    viewProps.yogaStyle.setBorder(edge, sourceProps.yogaStyle.border(edge));
  }
  startView.props = props;
#endif
  return startView;
}

void LayoutAnimationsProxy::detachCarrier(
    SharedTransitionRun &run,
    const ShadowView &startView,
    const bool nested,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  const auto &node = run.carrier;
  const auto tag = node->current.tag;
  const auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  const auto mounted = mountedView(node);
  cancelLayoutAnimation(tag);
  const bool beforeScreenSnapshot = canDetachBeforeScreenSnapshot(node, transaction);
  ShadowViewMutationList mutations;
  if (nested) {
    carrierPlacements_.nest(node);
  } else {
#ifdef ANDROID
    // React Native Screens holds what is left in a removed screen when it mounts the Remove, which is after the
    // release.
    react_native_assert(
        !isInRemovedScreen(node, transaction.filteredMutations) &&
        "A carrier must move to the root before its screen is removed");
#endif
    mutations.push_back(
        ShadowViewMutation::RemoveMutation(parent->current.tag, mounted, parent->hostIndex(parent->positionOf(node))));
    carrierPlacements_.detach(node, layoutRootOf(node));
  }
  // The run owns the frames of its carrier, so an animation that this transaction queued or that
  // waits for a landing for the same view does not start.
  const auto isCarrier = [&node](const PendingNodeAnimation &animation) {
    return animation.node == node;
  };
  std::erase_if(transaction.layout, isCarrier);
  std::erase_if(transaction.entering, isCarrier);
  std::erase_if(heldEnterings_, isCarrier);

  forgetHiddenView(tag);
  // Android writes only the raw props of an Update, so the opacity must be in them to show
  // a carrier that was hidden.
  run.carrierStartView = cloneViewWithOpacity(startView, getViewProps(startView).opacity, propsParserContext);
#ifdef ANDROID
  run.carrierStartView = resetPropsMissingFrom(run.carrierStartView, mounted, propsParserContext);
#endif
  if (nested) {
    mutations.push_back(ShadowViewMutation::UpdateMutation(mounted, run.carrierStartView, parent->current.tag));
  } else {
    ensureCarrierOverlay(mutations, propsParserContext);
    mutations.push_back(
        ShadowViewMutation::InsertMutation(carrierHostTag(node), run.carrierStartView, carrierHostIndex(node)));
    mutations.push_back(ShadowViewMutation::UpdateMutation(mounted, run.carrierStartView, carrierHostTag(node)));
  }

  auto &filteredMutations = transaction.filteredMutations;
  if (!beforeScreenSnapshot) {
    filteredMutations.insert(filteredMutations.end(), mutations.begin(), mutations.end());
    return;
  }
  const auto position = filteredMutations.begin() + static_cast<std::ptrdiff_t>(*transaction.screenSnapshotRemoval);
  filteredMutations.insert(position, mutations.begin(), mutations.end());
  *transaction.screenSnapshotRemoval += mutations.size();
}

// React Native Screens snapshots a removed screen after pending updates, which shows the mounted
// part of the transaction on screen. A carrier that is detached after that Remove is not at the
// root in that frame. The detach can go before the Remove when no later mutation depends on the
// place of the carrier.
bool LayoutAnimationsProxy::canDetachBeforeScreenSnapshot(
    const std::shared_ptr<LightNode> &node,
    const TransactionMeta &transaction) const {
  if (!transaction.screenSnapshotRemoval) {
    return false;
  }
  const auto tag = node->current.tag;
  const auto parentTag = node->parent.lock()->current.tag;
  const auto &mutations = transaction.filteredMutations;
  const auto first = mutations.begin() + static_cast<std::ptrdiff_t>(*transaction.screenSnapshotRemoval);
  return std::none_of(first, mutations.end(), [&](const ShadowViewMutation &mutation) {
    const bool isRemoval = mutation.type == ShadowViewMutation::Remove || mutation.type == ShadowViewMutation::Delete;
    const bool changesChildren =
        mutation.type == ShadowViewMutation::Remove || mutation.type == ShadowViewMutation::Insert;
    const auto mutatedTag = (isRemoval ? mutation.oldChildShadowView : mutation.newChildShadowView).tag;
    return mutatedTag == tag ||
        (changesChildren && (mutation.parentTag == parentTag || mutation.parentTag == surfaceId_));
  });
}

void LayoutAnimationsProxy::attachCarrier(
    SharedTransitionRun &run,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  const auto node = run.carrier;
  if (node->presence() == ReactPresence::REMOVED) {
    endAnimationsRecursively(node, mutations, mutations);
    return;
  }
  const auto tag = node->current.tag;
  const auto mounted = carrierViewOnScreen(run);
  const auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  const bool detached = node->placement() == CarrierPlacement::AT_ROOT;
  if (detached) {
    mutations.push_back(ShadowViewMutation::RemoveMutation(carrierHostTag(node), mounted, carrierHostIndex(node)));
  }
  carrierPlacements_.attach(node);
  cancelLayoutAnimation(tag);

  resolveLightNodeProps(node);
  // React's Remove marks a carrier as exiting before its subtree removal runs, so a carrier can return
  // to its parent while it exits. Then it keeps its opacity and does not go back into its shared element.
  auto homeView = node->isExiting() ? node->current : cloneViewWithoutOpacity(node->current, propsParserContext);
#ifdef ANDROID
  homeView = resetPropsMissingFrom(homeView, mounted, propsParserContext);
#endif
  const auto parentTag = parent->current.tag;
  if (detached) {
    mutations.push_back(
        ShadowViewMutation::InsertMutation(parentTag, homeView, parent->hostIndex(parent->positionOf(node))));
  }
  mutations.push_back(createPropsUpdate(mounted, homeView, parentTag, propsParserContext));
  if (!node->isExiting()) {
    hideInSharedElement(run.sharedTag, node);
  }
  if (run.contentFade) {
    restoreFadedChildren(*run.contentFade, {}, hiddenViewTags(), mutations, propsParserContext);
  }
}

void LayoutAnimationsProxy::retainRemovedCarriers(const std::shared_ptr<LightNode> &node, TransactionMeta &transaction)
    const {
  if (transaction.surfaceDropped) {
    return;
  }
  std::vector<std::shared_ptr<LightNode>> carriers;
  for (const auto &carrier : carrierPlacements_.atRoot()) {
    if (carrier->presence() != ReactPresence::REMOVED && isInSubtree(carrier, node) &&
        !isInSubtree(carrierPlacements_.hostOf(carrier), node)) {
      carriers.push_back(carrier);
    }
  }
  for (const auto &carrier : carriers) {
    carrierPlacements_.retain(carrier);
  }
  for (const auto &carrier : carriers) {
    retainCarrierContent(carrier);
  }
}

// A carrier stays in the layout root that mounts it, so it ends before React removes that layout root.
void LayoutAnimationsProxy::removeCarriersHostedIn(const std::shared_ptr<LightNode> &node, TransactionMeta &transaction)
    const {
  const auto carriers = carrierPlacements_.atRoot();
  for (const auto &carrier : carriers) {
    const bool reactRemoves = carrier->presence() == ReactPresence::REMOVED || isInSubtree(carrier, node);
    if (carrier->placement() == CarrierPlacement::AT_ROOT && reactRemoves &&
        isInSubtree(carrierPlacements_.hostOf(carrier), node)) {
#ifdef ANDROID
      if (!transaction.surfaceDropped && hasUnqueuedCarrierFrame(carrier->current.tag)) {
        removeCarrierBeforeQueuedFrames(carrier, transaction.filteredMutations);
        continue;
      }
#endif
      endAnimationsRecursively(carrier, transaction.filteredMutations, transaction.filteredMutations);
    }
  }
}

void LayoutAnimationsProxy::retainCarrierContent(const std::shared_ptr<LightNode> &node) const {
  if (!node->isExiting() || node->state == ExitingState::DECISION_PENDING) {
    node->setExitingState(ExitingState::WAITING);
  }
  layoutAnimationsManager_->clearLayoutAnimationConfig(node->current.tag);
  for (const auto &child : node->children) {
    retainCarrierContent(child);
  }
}

bool LayoutAnimationsProxy::isRetainedContent(const std::shared_ptr<LightNode> &node) const {
  return !carrierPlacements_.atRoot().empty() && isInRetainedCarrier(node);
}

bool LayoutAnimationsProxy::defersSubtreeRemoval(const std::shared_ptr<LightNode> &node) const {
  if (std::ranges::any_of(
          carrierPlacements_.atRoot(), [&node](const auto &carrier) { return isInSubtree(carrier, node); })) {
    return true;
  }
  // A tagged view of the top screen can become the source of a run in this pull.
  if (!topScreen_) {
    return false;
  }
  auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  std::vector<std::shared_ptr<LightNode>> pending{node};
  while (!pending.empty()) {
    const auto next = std::move(pending.back());
    pending.pop_back();
    if (next->isExiting() && next->state != ExitingState::DECISION_PENDING) {
      continue;
    }
    if (isViewKind(next->current) && sharedTransitionManager_->tagToName_.contains(next->current.tag) &&
        isInSubtree(next, topScreen_)) {
      return true;
    }
    pending.insert(pending.end(), next->children.begin(), next->children.end());
  }
  return false;
}

std::shared_ptr<LightNode> LayoutAnimationsProxy::detachedCarrierOf(const std::shared_ptr<LightNode> &start) const {
  if (carrierPlacements_.atRoot().empty()) {
    return {};
  }
  auto node = start;
  while (node && node->placement() != CarrierPlacement::AT_ROOT) {
    node = node->parent.lock();
  }
  return node;
}

std::shared_ptr<LightNode> LayoutAnimationsProxy::carrierAncestorOf(const std::shared_ptr<LightNode> &node) const {
  auto ancestor = node->parent.lock();
  while (ancestor && !ancestor->isCarrier()) {
    ancestor = ancestor->parent.lock();
  }
  return ancestor;
}

// A detached carrier moves on its own, so the carriers below it are not carried by the carriers above it.
bool LayoutAnimationsProxy::isCarriedBy(
    const std::shared_ptr<LightNode> &carrier,
    const std::shared_ptr<LightNode> &ancestor) const {
  for (auto node = carrierAncestorOf(carrier); node;
       node = node->placement() == CarrierPlacement::AT_ROOT ? nullptr : carrierAncestorOf(node)) {
    if (node == ancestor) {
      return true;
    }
  }
  return false;
}

// A carrier moves with the moving carrier above it while the target of that carrier holds its target.
bool LayoutAnimationsProxy::keepsNesting(
    const std::shared_ptr<LightNode> &carrier,
    const std::shared_ptr<LightNode> &target) const {
  const auto ancestor = carrierAncestorOf(carrier);
  const auto *carried = ancestor ? runOfCarrier(ancestor) : nullptr;
  return carried && isInSubtree(target, carried->target);
}

// The carrier keeps its frame on screen, and its animation continues in the space of the root to its target there.
// A gesture interpolates between the ends of the run, so the start follows the parent to where it was at the start.
void LayoutAnimationsProxy::moveNestedCarrierToRoot(
    SharedTransitionRun &run,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  const auto &node = run.carrier;
  const auto tag = node->current.tag;
  const auto parent = node->parent.lock();
  const auto offset = originOnScreen(parent);
  const auto startOffset = run.driver == SharedTransitionDriver::GESTURE ? offset - carriedDistance(node) : offset;
  const auto mounted = carrierViewOnScreen(run);
  mutations.push_back(
      ShadowViewMutation::RemoveMutation(parent->current.tag, mounted, parent->hostIndex(parent->positionOf(node))));
  carrierPlacements_.detach(node, layoutRootOf(node));
  run.carrierStartView.layoutMetrics.frame.origin += startOffset;
  auto view = mounted;
  view.layoutMetrics.frame.origin += offset;
  const auto target = asCarrierView(targetOnScreen(run, propsParserContext), node, propsParserContext);
  view = reparentLayoutAnimation(tag, carrierHostTag(node), target, offset).value_or(view);
  if (const auto animationIt = layoutAnimations_.find(tag); animationIt != layoutAnimations_.end()) {
    animationIt->second.startView.layoutMetrics.frame.origin += startOffset - offset;
  }
  ensureCarrierOverlay(mutations, propsParserContext);
  mutations.push_back(ShadowViewMutation::InsertMutation(carrierHostTag(node), view, carrierHostIndex(node)));
}

// How far the carriers that move a nested carrier moved it since their runs started.
react::Point LayoutAnimationsProxy::carriedDistance(const std::shared_ptr<LightNode> &carrier) const {
  react::Point distance{};
  for (auto node = carrierAncestorOf(carrier); node;
       node = node->placement() == CarrierPlacement::AT_ROOT ? nullptr : carrierAncestorOf(node)) {
    const auto *carried = runOfCarrier(node);
    if (!carried) {
      break;
    }
    const auto &animation = carrierAnimation(*carried);
    distance += animation.currentView.layoutMetrics.frame.origin - animation.startView.layoutMetrics.frame.origin;
  }
  return distance;
}

// React removes a view between a nested carrier and the carrier that moves it, so the nested carrier moves on from
// the root, where the removal keeps it.
void LayoutAnimationsProxy::moveNestedCarriersOutOf(
    const std::shared_ptr<LightNode> &node,
    TransactionMeta &transaction) const {
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  for (auto &run : activeSharedTransitionRuns()) {
    if (run.carrier->placement() == CarrierPlacement::NESTED && isLinkedInSubtree(run.carrier, node) &&
        !isInSubtree(carrierAncestorOf(run.carrier), node)) {
      moveNestedCarrierToRoot(run, transaction.filteredMutations, propsParserContext);
      if (restartsAtRoot(run)) {
        const auto target = targetOnScreen(run, propsParserContext);
        run.followsTarget = run.configFollowsTarget;
        startSharedTransition(
            run.carrier,
            carrierAnimation(run).currentView,
            asCarrierView(target, run.carrier, propsParserContext),
            ownCarrierView(target, run.carrier, propsParserContext).props,
            run.config,
            restartContentFade(run));
      }
    }
  }
}

// A running built-in transition interpolates from a start in the space of the moving parent, so a carrier that moves
// to the root starts again from its frame on screen.
bool LayoutAnimationsProxy::restartsAtRoot(const SharedTransitionRun &run) const {
  const auto tag = run.carrier->current.tag;
  if (layoutAnimationPhase(tag) != LayoutAnimationPhase::RUNNING) {
    return false;
  }
  return layoutAnimations_.at(tag).geometryProgress.has_value();
}

// A carrier that changes its frame space keeps its target, shifted by the offset between the spaces.
ShadowView LayoutAnimationsProxy::movedCarrierTarget(const Tag tag, const react::Point offset) const {
  auto target = lightNodes_.at(tag)->current;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    target = it->second.finalView;
  } else if (const auto completedIt = completedAnimations_.find(tag); completedIt != completedAnimations_.end()) {
    target = completedIt->second.animation.finalView;
  }
  target.layoutMetrics.frame.origin += offset;
  return target;
}

Tag LayoutAnimationsProxy::carrierParentTag(const std::shared_ptr<LightNode> &carrier) const {
  if (carrier->placement() == CarrierPlacement::AT_ROOT) {
    return carrierHostTag(carrier);
  }
  const auto parent = carrier->parent.lock();
  react_native_assert(parent && "A carrier that is not at the root has a parent");
  return parent ? parent->current.tag : surfaceId_;
}

static std::optional<Transform> invertedTransform(const Transform &transform) {
  css::TransformMatrix3D::MatrixArray values{};
  std::ranges::copy(transform.matrix, values.begin());
  css::TransformMatrix3D matrix(values);
  if (!matrix.invert()) {
    return std::nullopt;
  }
  Transform inverted;
  for (size_t i = 0; i < inverted.matrix.size(); ++i) {
    inverted.matrix[i] = static_cast<Float>(matrix[i]);
  }
  return inverted;
}

// The parent of a nested carrier keeps its place in the carrier that moves it, which ends at its own target.
// So the nested carrier ends where its target is in that target, with the transforms below that target.
ShadowView LayoutAnimationsProxy::targetInCarrierSpace(
    const SharedTransitionRun &run,
    const ShadowView &target,
    const PropsParserContext &propsParserContext) const {
  if (run.carrier->placement() != CarrierPlacement::NESTED) {
    return target;
  }
  const auto ancestor = carrierAncestorOf(run.carrier);
  const auto *carried = ancestor ? runOfCarrier(ancestor) : nullptr;
  react_native_assert(carried && "A nested carrier moves in a carrier");
  if (!carried) {
    return target;
  }
  const auto &ancestorTarget = carried->target;
  resolveLightNodeProps(run.target);
  auto view = target;
  view.props = run.target->current.props;
  view.layoutMetrics.frame.origin =
      positionIn(run.target, ancestorTarget, false) - positionIn(run.carrier->parent.lock(), ancestor, true);
  const auto ancestors = collectAncestors(run.target, false);
  auto positions = getAbsolutePositionsForRootPathView(run.target, false);
  const auto depth = std::ranges::find(ancestors, ancestorTarget->current.tag, &Ancestor::tag) - ancestors.begin();
  positions.resize(std::min(positions.size(), static_cast<size_t>(depth)));
  auto transform = parseParentTransforms(ancestors, positions);
  if (const auto above = transformsAboveNestedCarrier(run.carrier, ancestor, view)) {
    const auto &own = ancestors[0];
    const auto below = transform.value_or(resolveTransform(own.ownSize, own.ownSize, own.transform, {}));
    if (const auto inverse = invertedTransform(*above)) {
      const auto origin = getTranslateForTransformOrigin(own.ownSize.width, own.ownSize.height, own.origin);
      const auto inverseAboveInOwnOrigin = Transform::Translate(-origin[0], -origin[1], -origin[2]) * *inverse *
          Transform::Translate(origin[0], origin[1], origin[2]);
      transform = Transform::FromTransformOperation(
          react::TransformOperation(TransformOperationType::Arbitrary), {}, inverseAboveInOwnOrigin * below);
    }
  }
  overrideTransform(view, transform, propsParserContext);
  return view;
}

// The views between a nested carrier and the carrier that moves it keep their transforms during the flight. The view
// is the frame of the nested carrier in its parent.
std::optional<Transform> LayoutAnimationsProxy::transformsAboveNestedCarrier(
    const std::shared_ptr<LightNode> &carrier,
    const std::shared_ptr<LightNode> &ancestor,
    const ShadowView &view) const {
  const auto parent = carrier->parent.lock();
  auto ancestors = collectAncestors(parent, true);
  auto positions = getAbsolutePositionsForRootPathView(parent, true);
  const auto depth = std::ranges::find(ancestors, ancestor->current.tag, &Ancestor::tag) - ancestors.begin();
  positions.resize(std::min(positions.size(), static_cast<size_t>(depth)));
  if (positions.empty()) {
    return std::nullopt;
  }
  const auto &frame = view.layoutMetrics.frame;
  ancestors.insert(ancestors.begin(), Ancestor{.tag = carrier->current.tag, .ownSize = frame.size});
  positions.insert(positions.begin(), positions[0] + frame.origin);
  return parseParentTransforms(ancestors, positions);
}

// The view on screen with its own props, in the space of its parent. The snapshot is relative to the root and may
// be from before an attach in this pull, which returned the carrier to its committed layout.
ShadowView LayoutAnimationsProxy::inParentSpace(const ShadowView &snapshot, const std::shared_ptr<LightNode> &node)
    const {
  auto view = mountedView(node);
  view.layoutMetrics = snapshot.layoutMetrics;
  view.layoutMetrics.frame.origin = snapshot.layoutMetrics.frame.origin - originOnScreen(node->parent.lock());
  return view;
}

react::Point LayoutAnimationsProxy::originOnScreen(const std::shared_ptr<LightNode> &node) const {
  if (const auto *carried = node->placement() == CarrierPlacement::AT_ROOT ? runOfCarrier(node) : nullptr) {
    return carrierViewOnScreen(*carried).layoutMetrics.frame.origin;
  }
  return getAbsolutePositionsForRootPathView(node, true)[0];
}

react::Point LayoutAnimationsProxy::positionIn(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<LightNode> &ancestor,
    const bool useViewsOnScreen) const {
  const auto positions = getAbsolutePositionsForRootPathView(node, useViewsOnScreen);
  size_t depth = 0;
  for (auto pathNode = node; pathNode != ancestor && depth + 1 < positions.size(); pathNode = pathNode->parent.lock()) {
    depth++;
  }
  react_native_assert(isInSubtree(node, ancestor) && "The view is not in the ancestor");
  return positions[0] - positions[depth];
}

// A live carrier that retires because of a new shared tag keeps its frames, and its attach waits for them.
bool LayoutAnimationsProxy::isRetiringContent(const Tag tag) const {
  if (carrierPlacements_.atRoot().empty()) {
    return false;
  }
  const auto node = lightNodes_.find(tag);
  if (node == lightNodes_.end() || !node->second->isExiting()) {
    return false;
  }
  const auto carrier = detachedCarrierOf(node->second);
  return carrier && sharedTransitionRun(carrier->current.tag, SharedTransitionLifecycle::RETIRING);
}

void LayoutAnimationsProxy::retireOrphanedSharedTransitions() const {
  const auto isLive = [this](const auto &node) {
    return isLightNodeMapped(node) && !node->isExiting();
  };
  for (auto &[_, run] : sharedTransitionRuns_) {
    if (run.lifecycle == SharedTransitionLifecycle::ACTIVE && !isLive(run.source) && !isLive(run.target)) {
      retireSharedTransition(run);
    }
  }
}

void LayoutAnimationsProxy::finishCoveredSharedTransitions(
    const std::shared_ptr<LightNode> &topScreen,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  for (auto &[carrierTag, run] : sharedTransitionRuns_) {
    if (run.lifecycle != SharedTransitionLifecycle::ACTIVE) {
      continue;
    }
    const auto &target = run.target;
    // A target that carries another run moves above the screens or inside its moving ancestor.
    const bool carriesAnotherRun = target->isCarrier() && target != run.carrier;
    // Without an active boundary, the new screen covers every target.
    const bool onTopScreen = topScreen && isInSubtree(target, topScreen);
    const bool movesWithAncestor =
        run.carrier->placement() == CarrierPlacement::NESTED && carrierAncestorOf(run.carrier);
    if (!isLightNodeMapped(target) || target->isExiting() || carriesAnotherRun || onTopScreen || movesWithAncestor) {
      continue;
    }
    if (hasUnqueuedCarrierFrame(carrierTag)) {
      retireSharedTransition(run);
    } else {
      finishSharedTransition(run, transaction, propsParserContext);
    }
  }
}

void LayoutAnimationsProxy::retireSharedTransition(SharedTransitionRun &run) const {
  react_native_assert(run.lifecycle == SharedTransitionLifecycle::ACTIVE && "The run already retires");
  finishCallback(run, false);
  run.lifecycle = SharedTransitionLifecycle::RETIRING;
}

void LayoutAnimationsProxy::finishRetiringSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations) const {
  if (!flushStructuralMutations) {
    return;
  }
  for (auto &[carrierTag, run] : sharedTransitionRuns_) {
    if (run.lifecycle == SharedTransitionLifecycle::RETIRING && !hasUnqueuedCarrierFrame(carrierTag)) {
      finishSharedTransition(run, transaction, propsParserContext, false);
    }
  }
}

void LayoutAnimationsProxy::flushSubtreeRemovals(TransactionMeta &transaction) const {
  for (const auto &node : transaction.removedSubtrees) {
    if (isLightNodeMapped(node)) {
      handleSubtreeRemoval(node, transaction);
    }
  }
  if (transaction.surfaceDropped) {
    removeCarriersHostedIn(lightNodes_.at(surfaceId_), transaction);
  }
}

void LayoutAnimationsProxy::scheduleTransitionLifecycleCleanup() const {
  const bool pendingCancellation = transition_ && transition_->updated &&
      transition_->state == TransitionState::CANCELLED &&
      (!uncommittedScreenPop_ || !uncommittedScreenPop_->sourceScreen || uncommittedScreenPop_->cancelled);
  if (pendingCancellation || (uncommittedScreenPop_ && !uncommittedScreenPop_->sourceScreen)) {
    schedulePullOnNextFrame();
  }
}

void LayoutAnimationsProxy::removeFromParent(
    const std::shared_ptr<LightNode> &node,
    ShadowViewMutationList &mutations,
    ShadowViewMutationList &rootMutations) const {
  const auto parent = node->parent.lock();
  react_native_assert((parent || node->presence() == ReactPresence::REMOVED) && "Parent node is nullptr");
  auto *carried = node->isCarrier() ? runOfCarrier(node) : nullptr;
  if (carried) {
    deferRestore({carried->sharedTag, carried->target});
  }
  if (node->placement() == CarrierPlacement::AT_ROOT) {
    const auto &carrierView = carried ? carrierViewOnScreen(*carried) : node->current;
    rootMutations.push_back(
        ShadowViewMutation::RemoveMutation(carrierHostTag(node), carrierView, carrierHostIndex(node)));
  } else {
    const auto position = parent->positionOf(node);
    react_native_assert(position != -1 && "Removed node not found in its parent");
    auto &parentMutations = parent->current.tag == surfaceId_ ? rootMutations : mutations;
    parentMutations.push_back(
        ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, parent->hostIndex(position)));
  }
  carrierPlacements_.tearDown(node);
  if (carried) {
    finishCallback(*carried, false);
    carried->lifecycle = SharedTransitionLifecycle::FINISHED;
  }
  if (parent) {
    parent->removeChild(node);
  }
  cancelLayoutAnimation(node->current.tag);
}

// Detached carriers follow the children of their layout root, or live in the overlay on iOS.
int LayoutAnimationsProxy::carrierHostIndex(const std::shared_ptr<LightNode> &node) const {
  const auto index = carrierPlacements_.indexInHost(node);
#ifdef __APPLE__
  if (carrierOverlay_) {
    return index;
  }
#endif
  const auto &host = carrierPlacements_.hostOf(node);
  return host->hostIndex(static_cast<int>(host->children.size())) + index;
}

Tag LayoutAnimationsProxy::carrierHostTag(const std::shared_ptr<LightNode> &node) const {
#ifdef __APPLE__
  if (carrierOverlay_) {
    return carrierOverlay_->current.tag;
  }
#endif
  return carrierPlacements_.hostOf(node)->current.tag;
}

// iOS presents modals above the root view, so the overlay that holds the carriers is created with the first carrier
// and kept on top of the window until the surface stops.
void LayoutAnimationsProxy::ensureCarrierOverlay(
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
#ifdef __APPLE__
  if (!setSharedTransitionOverlay_ || carrierOverlay_) {
    return;
  }
  const auto &descriptor = componentDescriptorRegistry_->at("View");
  ShadowView overlay;
  overlay.componentName = descriptor.getComponentName();
  overlay.componentHandle = descriptor.getComponentHandle();
  overlay.surfaceId = surfaceId_;
  {
    auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
    overlay.tag = sharedTransitionManager_->nextOverlayTag_;
    sharedTransitionManager_->nextOverlayTag_ -= 10;
  }
  overlay.props =
      descriptor.cloneProps(propsParserContext, nullptr, RawProps(folly::dynamic::object("pointerEvents", "none")));
  overlay.layoutMetrics = lightNodes_.at(surfaceId_)->current.layoutMetrics;
  carrierOverlay_ = std::make_shared<LightNode>();
  carrierOverlay_->current = overlay;
  mutations.push_back(ShadowViewMutation::CreateMutation(overlay));
  // The overlay is never inserted, and a recycled view keeps the props of its previous use until an update.
  auto recycledView = overlay;
  recycledView.props = descriptor.cloneProps(propsParserContext, nullptr, {});
  recycledView.layoutMetrics = EmptyLayoutMetrics;
  mutations.push_back(ShadowViewMutation::UpdateMutation(recycledView, overlay, Tag{0}));
  setSharedTransitionOverlay_(surfaceId_, overlay.tag);
#endif
}

// A run that ended keeps the record of its carrier until the run finishes.
const LayoutAnimation &LayoutAnimationsProxy::carrierAnimation(const SharedTransitionRun &run) const {
  const auto tag = run.carrier->current.tag;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    return it->second;
  }
  return completedAnimations_.at(tag).animation;
}

const ShadowView &LayoutAnimationsProxy::carrierViewOnScreen(const SharedTransitionRun &run) const {
  const auto tag = run.carrier->current.tag;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    return it->second.currentView;
  }
  if (const auto it = completedAnimations_.find(tag); it != completedAnimations_.end()) {
    return it->second.animation.currentView;
  }
  return run.carrierStartView;
}

SharedTransitionRun *LayoutAnimationsProxy::runOfCarrier(const std::shared_ptr<LightNode> &node) const {
  const auto it = sharedTransitionRuns_.find(node->current.tag);
  const bool found = it != sharedTransitionRuns_.end() && it->second.carrier == node &&
      it->second.lifecycle != SharedTransitionLifecycle::FINISHED;
  react_native_assert(found && "The node is not a carrier");
  return found ? &it->second : nullptr;
}

SharedTransitionRun *LayoutAnimationsProxy::activeSharedTransitionRun(const SharedTag &sharedTag) const {
  const auto it = std::ranges::find_if(sharedTransitionRuns_, [&sharedTag](const auto &entry) {
    return entry.second.lifecycle == SharedTransitionLifecycle::ACTIVE && entry.second.sharedTag == sharedTag;
  });
  return it == sharedTransitionRuns_.end() ? nullptr : &it->second;
}

SharedTransitionRun *LayoutAnimationsProxy::sharedTransitionRun(
    const Tag carrierTag,
    const SharedTransitionLifecycle lifecycle) const {
  const auto it = sharedTransitionRuns_.find(carrierTag);
  return it != sharedTransitionRuns_.end() && it->second.lifecycle == lifecycle ? &it->second : nullptr;
}

void LayoutAnimationsProxy::handleSharedTransitionsStart(
    const std::shared_ptr<LightNode> &afterTopScreen,
    const std::shared_ptr<LightNode> &beforeTopScreen,
    TransactionMeta &transaction,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("LayoutAnimationsProxy::handleSharedTransitionsStart");

  if (!beforeTopScreen) {
    return;
  }
  if (!afterTopScreen) {
    finishCoveredSharedTransitions(nullptr, transaction, propsParserContext);
    return;
  }

  if (beforeTopScreen != afterTopScreen) {
    filterSharedTransitionStarts(SharedTransitionDriver::TIME, transaction, propsParserContext);
    adjustForNativePlacement(transaction.transitions);
    for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;
      const auto &transform = transition.transform;
      overrideTransform(before, transform[BEFORE], propsParserContext);
      overrideTransform(after, transform[AFTER], propsParserContext);
      const auto config = layoutAnimationsManager_->getSharedTransitionConfig(before.tag);
      const auto &afterNode = collectedTransition.nodes[AFTER];
      react_native_assert(afterNode && "Shared transition target not found");
      if (!afterNode) {
        continue;
      }
      warnIfSnapshotIsStale(before, transaction);
      warnIfSnapshotIsStale(after, transaction);
      auto &run = startSharedTransitionRun(
          before,
          sharedTag,
          collectedTransition.nodes,
          config->animation,
          SharedTransitionDriver::TIME,
          config->contentFade,
          config->callback,
          transaction,
          propsParserContext);

      run.configFollowsTarget = config->followsTarget;
      run.followsTarget = config->followsTarget;
      waitForTargetWindow(run, afterNode);
      const auto target = targetInCarrierSpace(run, after, propsParserContext);
      startSharedTransition(
          run.carrier,
          run.carrierStartView,
          asCarrierView(target, run.carrier, propsParserContext),
          ownCarrierView(target, run.carrier, propsParserContext).props,
          config->animation,
          restartContentFade(run));
    }
    finishCoveredSharedTransitions(afterTopScreen, transaction, propsParserContext);
  } else if (!mutations.empty()) {
    for (auto it = transaction.transitions.begin(); it != transaction.transitions.end();) {
      const auto current = it++;
      auto &[sharedTag, collectedTransition] = *current;
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;

      auto *activeRun = activeSharedTransitionRun(sharedTag);
      if (!activeRun) {
        continue;
      }
      auto &run = *activeRun;
      const auto &afterNode = collectedTransition.nodes[AFTER];
      react_native_assert(afterNode && "Shared transition target not found");
      if (!afterNode) {
        continue;
      }
      const auto host = layoutRootOf(run.carrier);
      if (afterNode != run.target && (isInOtherWindow(afterNode) || layoutRootOf(afterNode) != host)) {
        transaction.restoreRequests.push_back({sharedTag, afterNode});
        it = transaction.transitions.erase(current);
        continue;
      }
      const auto carrierTag = run.carrier->current.tag;
      const auto phase = layoutAnimationPhase(carrierTag);
      if (phase == LayoutAnimationPhase::NONE) {
        continue;
      }
      const bool targetChanged = run.target != afterNode;
      auto animation = run.config;
      auto followsTarget = run.configFollowsTarget;
      auto configSource = run.configSource;
      auto callback = run.callback;
      if (!targetChanged) {
        if (const auto config = configOfSource(run)) {
          animation = config->animation;
          followsTarget = config->followsTarget;
        }
      } else if (layoutRootOf(collectedTransition.nodes[BEFORE]) == host) {
        const auto config = layoutAnimationsManager_->getSharedTransitionConfig(before.tag);
        if (!config) {
          continue;
        }
        animation = config->animation;
        followsTarget = config->followsTarget;
        configSource = collectedTransition.nodes[BEFORE];
        callback = config->callback;
      }
      if (targetChanged) {
        finishCallback(run, false);
        run.callback = std::move(callback);
        waitForTargetWindow(run, afterNode);
        transaction.restoreRequests.push_back({sharedTag, run.target});
        if (!afterNode->isCarrier()) {
          hideInSharedElement(sharedTag, afterNode);
          transaction.filteredMutations.push_back(createPropsUpdate(
              after,
              cloneViewWithoutOpacity(after, propsParserContext),
              transition.parentTag[AFTER],
              propsParserContext));
        }
      }
      run.target = afterNode;
      if (phase != LayoutAnimationPhase::QUEUED || targetChanged) {
        run.config = animation;
        run.configFollowsTarget = followsTarget;
        run.configSource = configSource;
      }
      adjustForNativePlacement(collectedTransition, AFTER);
      const bool leavesMovingParent =
          run.carrier->placement() == CarrierPlacement::NESTED && !keepsNesting(run.carrier, run.target);
      if (leavesMovingParent) {
        moveNestedCarrierToRoot(run, transaction.filteredMutations, propsParserContext);
      }
      overrideTransform(after, transition.transform[AFTER], propsParserContext);
      const auto target = targetInCarrierSpace(run, after, propsParserContext);
      const auto carrierAfter = asCarrierView(target, run.carrier, propsParserContext);
      if (phase == LayoutAnimationPhase::QUEUED) {
        run.followsTarget = run.configFollowsTarget;
        updateLayoutAnimationTarget(
            carrierTag,
            carrierAfter,
            ownCarrierView(target, run.carrier, propsParserContext).props,
            run.config,
            restartContentFade(run));
      } else if (!targetChanged && !leavesMovingParent && followsWithoutRestart(run, carrierAfter)) {
        followSharedTransitionTarget(run, propsParserContext);
      } else if ((leavesMovingParent && restartsAtRoot(run)) || targetEndChanged(run, carrierAfter)) {
        run.followsTarget = followsTarget;
        startSharedTransition(
            run.carrier,
            carrierAnimation(run).currentView,
            carrierAfter,
            ownCarrierView(target, run.carrier, propsParserContext).props,
            animation,
            restartContentFade(run));
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
    if (node->isCarrier()) {
      continue;
    }
    hideInSharedElement(sharedTag, node);
    auto m = createPropsUpdate(
        shadowView, cloneViewWithoutOpacity(shadowView, propsParserContext), parentTag, propsParserContext);
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
  const auto hiddenTags = viewTagsKeptHidden();
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
  if (transition_->state == TransitionState::ACTIVE && progress == 1) {
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

bool LayoutAnimationsProxy::deferSharedTransitionConfigRelease(const Tag tag) {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return false;
  }
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (!lightNodes_.contains(tag)) {
    return false;
  }
  deferredSharedTransitionConfigReleases_.insert(tag);
  return true;
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

void LayoutAnimationsProxy::finishEndedSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations,
    std::unordered_set<Tag> &preservedTags) const {
  const auto coveringViews = viewsHiddenByContinuingRuns();
  for (auto &[carrierTag, run] : sharedTransitionRuns_) {
    if (run.lifecycle != SharedTransitionLifecycle::ACTIVE) {
      continue;
    }
    const auto blocker = landingBlocker(run, flushStructuralMutations, coveringViews);
    if (blocker == LandingBlocker::NONE) {
      finishSharedTransition(run, transaction, propsParserContext, true);
    } else if (blocker != LandingBlocker::CARRIER_NOT_ENDED) {
      preservedTags.insert(carrierTag);
    }
  }
}

// The carrier stays on screen until the target can show. A view in a hidden view does not show, so a target in a
// view that a continuing run hides waits for that run.
LandingBlocker LayoutAnimationsProxy::landingBlocker(
    const SharedTransitionRun &run,
    const bool flushStructuralMutations,
    const std::vector<std::shared_ptr<LightNode>> &coveringViews) const {
  const auto tag = run.carrier->current.tag;
  if (layoutAnimationPhase(tag) != LayoutAnimationPhase::ENDED) {
    return LandingBlocker::CARRIER_NOT_ENDED;
  }
  if (!flushStructuralMutations) {
    return LandingBlocker::NO_STRUCTURAL_FLUSH;
  }
  if (hasUnqueuedCarrierFrame(tag)) {
    return LandingBlocker::CARRIER_FRAMES_UNQUEUED;
  }
  if (landsWithOtherRuns(run)) {
    return LandingBlocker::LANDS_WITH_OTHER_RUNS;
  }
  if (isDescendantOfAny(run.target, coveringViews)) {
    return LandingBlocker::TARGET_IN_HIDDEN_VIEW;
  }
  // The carrier lands on the target only after the platform places the target.
  if (run.targetOffWindow) {
    return LandingBlocker::TARGET_OFF_WINDOW;
  }
  return LandingBlocker::NONE;
}

bool LayoutAnimationsProxy::waitsForCoveringRun(
    const SharedTransitionRun &run,
    const std::vector<std::shared_ptr<LightNode>> &coveringViews) const {
  return layoutAnimationPhase(run.carrier->current.tag) == LayoutAnimationPhase::ENDED &&
      isDescendantOfAny(run.target, coveringViews);
}

bool LayoutAnimationsProxy::runContinues(const Tag carrierTag) const {
  return layoutAnimationPhase(carrierTag) != LayoutAnimationPhase::ENDED || hasUnqueuedCarrierFrame(carrierTag);
}

// Nested carriers land with the carrier that moves them, when the last run of the group ends. A nested carrier
// that React moved out of every moving carrier lands on its own.
bool LayoutAnimationsProxy::landsWithOtherRuns(const SharedTransitionRun &run) const {
  if (run.carrier->placement() == CarrierPlacement::NESTED) {
    return carrierAncestorOf(run.carrier) != nullptr;
  }
  return std::ranges::any_of(activeSharedTransitionRuns(), [&](const SharedTransitionRun &nestedRun) {
    return nestedRun.carrier->placement() == CarrierPlacement::NESTED && isCarriedBy(nestedRun.carrier, run.carrier) &&
        runContinues(nestedRun.carrier->current.tag);
  });
}

// A run that ends ends the runs that it carries.
bool LayoutAnimationsProxy::carriesRunningRun(const SharedTransitionRun &run) const {
  return std::ranges::any_of(activeSharedTransitionRuns(), [&](const SharedTransitionRun &nestedRun) {
    return nestedRun.carrier->placement() == CarrierPlacement::NESTED && isCarriedBy(nestedRun.carrier, run.carrier) &&
        layoutAnimationPhase(nestedRun.carrier->current.tag) == LayoutAnimationPhase::RUNNING;
  });
}

std::vector<std::shared_ptr<LightNode>> LayoutAnimationsProxy::viewsHiddenByContinuingRuns() const {
  std::vector<std::shared_ptr<LightNode>> views;
  for (const auto &run : activeSharedTransitionRuns()) {
    if (!runContinues(run.carrier->current.tag)) {
      continue;
    }
    const auto elementIt = sharedElements_.find(run.sharedTag);
    if (elementIt == sharedElements_.end()) {
      continue;
    }
    for (const auto &hiddenView : elementIt->second.hiddenViews) {
      views.push_back(hiddenView.node);
    }
  }
  return views;
}

// The teardown of a nested carrier can remove this carrier and finish its run. A removed carrier does not attach,
// but its faded children show again.
void LayoutAnimationsProxy::finishSharedTransition(
    SharedTransitionRun &run,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool landed) const {
  finishCallback(run, landed);
  finishNestedSharedTransitions(run.carrier, transaction, propsParserContext, landed);
  const bool targetGone = !isLightNodeMapped(run.target) || run.target->isExiting();
  // A gesture-driven run leaves its source to the screen pop.
  transaction.restoreRequests.push_back(
      {run.sharedTag, run.target, run.driver == SharedTransitionDriver::GESTURE ? nullptr : run.source});
  if (run.lifecycle != SharedTransitionLifecycle::FINISHED) {
    attachCarrier(run, transaction.filteredMutations, propsParserContext);
  } else if (run.contentFade) {
    restoreFadedChildren(*run.contentFade, {}, hiddenViewTags(), transaction.filteredMutations, propsParserContext);
  }
  if (run.restoreCarrierOnFinish) {
    transaction.restoreRequests.push_back({run.sharedTag, run.carrier});
  }
  if (landed && !targetGone && run.contentFade && run.carrier != run.target) {
    fadeInTargetContent(run, transaction, propsParserContext);
  }
  run.lifecycle = SharedTransitionLifecycle::FINISHED;
  if (!heldEnterings_.empty()) {
    schedulePullOnNextFrame();
  }
}

// The runs nested in a carrier move with it, so they end when it attaches.
void LayoutAnimationsProxy::finishNestedSharedTransitions(
    const std::shared_ptr<LightNode> &carrier,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool landed) const {
  for (auto &[_, run] : sharedTransitionRuns_) {
    if (run.lifecycle == SharedTransitionLifecycle::ACTIVE && run.carrier->placement() == CarrierPlacement::NESTED &&
        isCarriedBy(run.carrier, carrier)) {
      finishSharedTransition(run, transaction, propsParserContext, landed);
    }
  }
}

// MARK: Content Fade

// The animation aims past the end of a fade-out that ends before the move, and the frames clamp it.
std::optional<ContentOpacityRange> LayoutAnimationsProxy::restartContentFade(SharedTransitionRun &run) const {
  if (!run.contentFade) {
    return std::nullopt;
  }
  auto &contentFade = *run.contentFade;
  contentFade.range = {contentOpacityOnScreen(run), run.carrier == run.target ? 1.0 : 0.0};
  const auto &[from, to] = contentFade.range;
  return ContentOpacityRange{.from = from, .to = from + (to - from) / fadeLength(contentFade)};
}

double LayoutAnimationsProxy::contentOpacityOnScreen(const SharedTransitionRun &run) const {
  const auto tag = run.carrier->current.tag;
  std::optional<double> animated;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    animated = it->second.contentOpacity;
  } else if (const auto it = completedAnimations_.find(tag); it != completedAnimations_.end()) {
    animated = it->second.animation.contentOpacity;
  }
  return animated.value_or(run.contentFade->range.from);
}

// Nested carriers and hidden endpoints keep their own opacity. A view that holds one does not fade, its other
// children do.
std::vector<std::shared_ptr<LightNode>> LayoutAnimationsProxy::fadingChildren(
    const std::shared_ptr<LightNode> &node,
    const std::unordered_set<Tag> &hiddenTags) const {
  std::unordered_set<Tag> holdingViews;
  const auto keepPathHolding = [&](const std::shared_ptr<LightNode> &view) {
    std::vector<Tag> path;
    for (auto pathNode = view->parent.lock(); pathNode; pathNode = pathNode->parent.lock()) {
      if (pathNode == node) {
        holdingViews.insert(path.begin(), path.end());
        return;
      }
      path.push_back(pathNode->current.tag);
    }
  };
  for (const auto &run : activeSharedTransitionRuns()) {
    if (run.carrier->placement() == CarrierPlacement::NESTED) {
      keepPathHolding(run.carrier);
    }
  }
  for (const auto &[_, element] : sharedElements_) {
    for (const auto &hiddenView : element.hiddenViews) {
      keepPathHolding(hiddenView.node);
    }
  }
  std::vector<std::shared_ptr<LightNode>> children;
  const auto collect = [&](const auto &self, const std::shared_ptr<LightNode> &parent) -> void {
    for (const auto &child : parent->children) {
      const auto tag = child->current.tag;
      if (!isLightNodeMapped(child) || child->isCarrier() || !isViewKind(child->current) || hiddenTags.contains(tag)) {
        continue;
      }
      if (holdingViews.contains(tag)) {
        self(self, child);
      } else {
        children.push_back(child);
      }
    }
  };
  collect(collect, node);
  return children;
}

ShadowView LayoutAnimationsProxy::withContentOpacity(
    const std::shared_ptr<LightNode> &child,
    const ShadowView &view,
    const double contentOpacity,
    const PropsParserContext &propsParserContext) const {
  return cloneViewWithOpacity(view, ownOpacity(child, view) * contentOpacity, propsParserContext);
}

// The light tree does not take synchronous writes, so a view without a layout animation gets its newest
// opacity from them.
double LayoutAnimationsProxy::ownOpacity(const std::shared_ptr<LightNode> &node, const ShadowView &animatedView) const {
  const auto tag = node->current.tag;
  if (layoutAnimationPhase(tag) != LayoutAnimationPhase::NONE) {
    return getViewProps(animatedView).opacity;
  }
  resolveLightNodeProps(node);
  const auto synchronousOpacity = readSynchronousOpacity_ ? readSynchronousOpacity_(tag) : std::nullopt;
  return synchronousOpacity.value_or(getViewProps(node->current).opacity);
}

// Synchronous writes skip pullTransaction. Only pull mutations change the opacity of a hidden view, because a pull
// can hide a carrier before the mutations that move it mount. A child of a fading carrier gets the content opacity.
void LayoutAnimationsProxy::composeSynchronousProps(UpdatesBatch &updatesBatch) const {
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto hiddenTags = viewTagsKeptHidden();
  std::unordered_map<Tag, double> factors;
  for (const auto *run : contentFadeRuns()) {
    for (const auto &child : fadingChildren(run->carrier, hiddenTags)) {
      factors[child->current.tag] = run->contentFade->mountedOpacity;
    }
  }
  if (hiddenTags.empty() && factors.empty()) {
    return;
  }
  for (auto &[family, props] : updatesBatch) {
    auto opacity = props.get_ptr("opacity");
    if (family->getSurfaceId() != surfaceId_ || !opacity) {
      continue;
    }
    const auto tag = family->getTag();
    if (hiddenTags.contains(tag)) {
      props.erase("opacity");
    } else if (const auto factor = factors.find(tag);
               factor != factors.end() && (opacity->isNumber() || opacity->isNull())) {
      const double ownOpacity = opacity->isNull() ? defaultViewOpacity() : opacity->asDouble();
      *opacity = ownOpacity * factor->second;
    }
  }
  std::erase_if(updatesBatch, [](const auto &update) { return update.second.empty(); });
}

void LayoutAnimationsProxy::applyContentOpacity(
    FadedChild &fadedChild,
    const double fromContentOpacity,
    const double toContentOpacity,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  const auto &child = fadedChild.node;
  const auto tag = child->current.tag;
  auto mountedContentOpacity = fromContentOpacity;
  for (auto &mutation : mutations) {
    if ((mutation.type != ShadowViewMutation::Update && mutation.type != ShadowViewMutation::Insert) ||
        mutation.newChildShadowView.tag != tag) {
      continue;
    }
    fadedChild.mounted.reset();
    if (mutation.type == ShadowViewMutation::Update) {
      const auto &oldView = mutation.oldChildShadowView;
      mutation.oldChildShadowView =
          cloneViewWithOpacity(oldView, getViewProps(oldView).opacity * mountedContentOpacity, propsParserContext);
    }
    mutation.newChildShadowView =
        withContentOpacity(child, mutation.newChildShadowView, toContentOpacity, propsParserContext);
    // Android does not apply the props of an Insert to a view that exists or that a Create made.
    if (mutation.type == ShadowViewMutation::Update) {
      mountedContentOpacity = toContentOpacity;
    }
  }
  if (mountedContentOpacity == toContentOpacity) {
    return;
  }
  const auto &view = mountedView(child);
  const auto opacity = ownOpacity(child, view);
  const auto &mounted = fadedChild.mounted;
  const bool isMountedFadeCurrent = mounted && mounted->source == view && mounted->ownOpacity == opacity &&
      mounted->contentOpacity == fromContentOpacity;
  const auto oldView = isMountedFadeCurrent
      ? mounted->view
      : cloneViewWithOpacity(view, opacity * fromContentOpacity, propsParserContext);
  auto newView = cloneViewWithOpacity(view, opacity * toContentOpacity, propsParserContext);
  const auto parent = child->parent.lock();
  mutations.push_back(
      createPropsUpdate(oldView, newView, parent ? parent->current.tag : surfaceId_, propsParserContext));
  fadedChild.mounted = MountedFade{
      .source = view,
      .ownOpacity = opacity,
      .contentOpacity = toContentOpacity,
      .view = std::move(newView),
  };
}

// A retiring run keeps the fade of its children until its carrier attaches.
std::vector<SharedTransitionRun *> LayoutAnimationsProxy::contentFadeRuns() const {
  std::vector<SharedTransitionRun *> runs;
  for (auto &[_, run] : sharedTransitionRuns_) {
    if (run.lifecycle != SharedTransitionLifecycle::FINISHED && run.contentFade) {
      runs.push_back(&run);
    }
  }
  return runs;
}

// Runs after all other mutations of the pull, so that React updates of the children keep the fade.
// All restores come first, so that a child that moves to another carrier gets the fade of that carrier.
void LayoutAnimationsProxy::composeCarrierContent(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  std::vector<std::pair<SharedTransitionRun *, std::vector<std::shared_ptr<LightNode>>>> fadingRuns;
  std::optional<std::unordered_set<Tag>> hiddenTags;
  for (auto *run : contentFadeRuns()) {
    if (!hiddenTags) {
      hiddenTags = hiddenViewTags();
    }
    auto children = fadingChildren(run->carrier, *hiddenTags);
    restoreFadedChildren(*run->contentFade, children, *hiddenTags, filteredMutations, propsParserContext);
    fadingRuns.emplace_back(run, std::move(children));
  }
  for (const auto &[run, children] : fadingRuns) {
    auto &contentFade = *run->contentFade;
    const auto opacity = contentOpacityOnScreen(*run);
    for (const auto &child : children) {
      const auto [entry, isNew] = contentFade.fadedChildren.try_emplace(child->current.tag);
      auto &fadedChild = entry->second;
      fadedChild.node = child;
      applyContentOpacity(
          fadedChild, isNew ? 1.0 : contentFade.mountedOpacity, opacity, filteredMutations, propsParserContext);
    }
    contentFade.mountedOpacity = opacity;
  }
}

void LayoutAnimationsProxy::restoreFadedChildren(
    ContentFade &contentFade,
    const std::vector<std::shared_ptr<LightNode>> &keptChildren,
    const std::unordered_set<Tag> &hiddenTags,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  std::erase_if(contentFade.fadedChildren, [&](auto &entry) {
    auto &[tag, fadedChild] = entry;
    if (std::ranges::find(keptChildren, fadedChild.node) != keptChildren.end()) {
      return false;
    }
    if (isLightNodeMapped(fadedChild.node) && !hiddenTags.contains(tag)) {
      applyContentOpacity(fadedChild, contentFade.mountedOpacity, 1, mutations, propsParserContext);
    }
    return true;
  });
}

void LayoutAnimationsProxy::holdTargetEntering(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  if (heldEnterings_.empty() && transaction.entering.empty()) {
    return;
  }
  // The transition is the entering animation of its target.
  const auto isRunTarget = [this](const PendingNodeAnimation &animation) {
    return std::ranges::any_of(activeSharedTransitionRuns(), [&animation](const SharedTransitionRun &run) {
      return run.target == animation.node && run.carrier != run.target;
    });
  };
  std::erase_if(transaction.entering, isRunTarget);
  const auto targetContent = fadingTargetContent();
  std::erase_if(heldEnterings_, [&](const PendingNodeAnimation &held) {
    if (!isLightNodeMapped(held.node) || isRunTarget(held)) {
      return true;
    }
    // A removed child stays hidden until it is gone, and its entering animation does not start.
    if (held.node->isExiting() || targetContent.contains(held.node)) {
      return false;
    }
    startHeldEntering(held, transaction, propsParserContext);
    return true;
  });
  std::erase_if(transaction.entering, [&](const PendingNodeAnimation &entering) {
    if (!targetContent.contains(entering.node)) {
      return false;
    }
    heldEnterings_.push_back(entering);
    return true;
  });
}

std::unordered_set<std::shared_ptr<LightNode>> LayoutAnimationsProxy::fadingTargetContent() const {
  std::unordered_set<std::shared_ptr<LightNode>> content;
  std::optional<std::unordered_set<Tag>> hiddenTags;
  for (const auto &run : activeSharedTransitionRuns()) {
    if (!run.contentFade || run.carrier == run.target) {
      continue;
    }
    if (!hiddenTags) {
      hiddenTags = hiddenViewTags();
    }
    std::ranges::copy(fadingChildren(run.target, *hiddenTags), std::inserter(content, content.end()));
  }
  return content;
}

// The entering animation replaces a layout animation of the child, which jumps to its final layout at opacity 0.
// The Update comes after the React mutations of the pull, so the child stays at opacity 0 until the first frame of
// its entering animation.
void LayoutAnimationsProxy::startHeldEntering(
    const PendingNodeAnimation &held,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  const auto &node = held.node;
  const auto tag = node->current.tag;
  const bool layoutQueued = std::erase_if(transaction.layout, [&node](const PendingNodeAnimation &layout) {
                              return layout.node == node;
                            }) > 0;
  resolveLightNodeProps(node);
  // A layout animation of this pull holds back the React Update, so the screen still shows the previous view.
  const auto mounted = layoutAnimationViewOnScreen(tag).value_or(layoutQueued ? node->previous : node->current);
  cancelLayoutAnimation(tag);
  const auto parent = node->parent.lock();
  transaction.filteredMutations.push_back(createPropsUpdate(
      mounted,
      cloneViewWithOpacity(node->current, 0, propsParserContext),
      parent ? parent->current.tag : surfaceId_,
      propsParserContext));
  startEnteringAnimation(node, held.config);
}

void LayoutAnimationsProxy::fadeInTargetContent(
    const SharedTransitionRun &run,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  for (const auto &child : fadingChildren(run.target, hiddenViewTags())) {
    if (const auto heldIt =
            std::ranges::find_if(heldEnterings_, [&child](const auto &held) { return held.node == child; });
        heldIt != heldEnterings_.end()) {
      if (!child->isExiting()) {
        startHeldEntering(*heldIt, transaction, propsParserContext);
        heldEnterings_.erase(heldIt);
      }
      continue;
    }
    const auto tag = child->current.tag;
    if (child->isExiting() || isQueuedOrRunning(layoutAnimationPhase(tag))) {
      continue;
    }
    const auto &view = mountedView(child);
    transaction.filteredMutations.push_back(createPropsUpdate(
        view,
        cloneViewWithOpacity(view, 0, propsParserContext),
        child->parent.lock()->current.tag,
        propsParserContext));
    startEnteringAnimation(child, run.contentFade->options.fadeIn, true);
  }
  schedulePullOnNextFrame();
}

void LayoutAnimationsProxy::hideInSharedElement(const SharedTag &sharedTag, const std::shared_ptr<LightNode> &node)
    const {
  if (!isLightNodeMapped(node)) {
    return;
  }
  forgetHiddenView(node->current.tag);
  sharedElements_[sharedTag].hiddenViews.push_back(HiddenView{.node = node});
}

RestoreRequest LayoutAnimationsProxy::withShownEndpoint(const RestoreRequest &request) const {
  const auto &target = request.node;
  if (request.sourceIfTargetGone && (!isLightNodeMapped(target) || target->isExiting())) {
    return {request.sharedTag, request.sourceIfTargetGone};
  }
  return request;
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

// A child with a held entering animation also stays at opacity 0 until the animation starts.
std::unordered_set<Tag> LayoutAnimationsProxy::viewTagsKeptHidden() const {
  auto tags = hiddenViewTags();
  for (const auto &held : heldEnterings_) {
    tags.insert(held.node->current.tag);
  }
  return tags;
}

// A view on the top screen stays hidden only while a run or the uncommitted screen pop moves it.
void LayoutAnimationsProxy::queuePendingRestores(TransactionMeta &transaction) const {
  if (sharedElements_.empty()) {
    return;
  }
  auto lock = std::unique_lock<std::mutex>(sharedTransitionManager_->mutex_);
  const auto &tagToName = sharedTransitionManager_->tagToName_;
  std::unordered_map<SharedTag, std::vector<Tag>> tagsBySharedTag;
  for (const auto &[sharedTag, element] : sharedElements_) {
    for (const auto &[node, restoreDeferred] : element.hiddenViews) {
      const auto nameIt = tagToName.find(node->current.tag);
      if (restoreDeferred || nameIt == tagToName.end() || nameIt->second != sharedTag ||
          !hasSharedViewInLayoutRoot(sharedTag, node, tagToName, tagsBySharedTag) ||
          (isOnTopScreen(node) && !isInSharedTransition(node))) {
        transaction.restoreRequests.push_back({sharedTag, node});
      }
    }
  }
}

bool LayoutAnimationsProxy::isOnTopScreen(const std::shared_ptr<LightNode> &node) const {
  for (auto current = node; current && !current->isExiting(); current = current->parent.lock()) {
    if (current == topScreen_) {
      return true;
    }
  }
  return false;
}

bool LayoutAnimationsProxy::isInSharedTransition(const std::shared_ptr<LightNode> &node) const {
  const bool isInRun = std::ranges::any_of(activeSharedTransitionRuns(), [&node](const SharedTransitionRun &run) {
    return node == run.source || node == run.target;
  });
  return isInRun ||
      (uncommittedScreenPop_ &&
       std::ranges::find(uncommittedScreenPop_->endpoints, node, &ProgressTransitionEndpoint::source) !=
           uncommittedScreenPop_->endpoints.end());
}

void LayoutAnimationsProxy::eraseFinishedSharedTransitionRuns() const {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return;
  }
  std::erase_if(sharedTransitionRuns_, [](const auto &entry) {
    return entry.second.lifecycle == SharedTransitionLifecycle::FINISHED;
  });
}

void LayoutAnimationsProxy::cleanupSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  ReanimatedSystraceSection s1("cleanupSharedTransitions");
  auto &filteredMutations = transaction.filteredMutations;
  for (const auto &pendingRequest : transaction.restoreRequests) {
    ReanimatedSystraceSection s("Restore tag");
    const auto request = withShownEndpoint(pendingRequest);
    const auto &node = request.node;
    if (isInSharedTransition(node)) {
      deferRestore(request);
      continue;
    }
    if (node->isCarrier() || !showHiddenView(request) || !isLightNodeMapped(node)) {
      continue;
    }
    resolveLightNodeProps(node);
    const auto &view = viewOnScreen(node);
    const auto parent = node->parent.lock();
    react_native_assert(parent && "Parent node is nullptr");
    if (!parent) {
      continue;
    }
    const auto opacity = ownOpacity(node, view);
    filteredMutations.push_back(createPropsUpdate(
        cloneViewWithoutOpacity(view, propsParserContext),
        cloneViewWithOpacity(view, opacity, propsParserContext),
        parent->current.tag,
        propsParserContext));
  }
#ifdef __APPLE__
  // The overlay is attached to its window after a mount, which misses a commit that the mount forces, such as the
  // snapshot of a dismissed screen, so the overlay stays attached between transitions.
  if (transaction.surfaceDropped && carrierOverlay_) {
    react_native_assert(carrierPlacements_.atRoot().empty() && "The last pull of a surface removes its carriers");
    setSharedTransitionOverlay_(surfaceId_, std::nullopt);
    filteredMutations.push_back(ShadowViewMutation::DeleteMutation(carrierOverlay_->current));
    carrierOverlay_.reset();
  }
#endif

  std::erase_if(sharedElements_, [](const auto &entry) { return entry.second.hiddenViews.empty(); });
}

// MARK: Position Calculation

// A running or queued layout animation keeps the frame that is on screen in its own record.
// The light node holds the committed layout, which the animation has not reached yet.
// The record of a detached carrier is relative to the root, so its place under its parent
// is the committed layout.
const ShadowView &LayoutAnimationsProxy::viewOnScreen(const std::shared_ptr<LightNode> &node) const {
  if (node->placement() == CarrierPlacement::AT_ROOT) {
    return node->current;
  }
  const auto tag = node->current.tag;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    return it->second.currentView;
  }
  if (const auto it = completedAnimations_.find(tag); it != completedAnimations_.end() && !it->second.shouldRemove) {
    return it->second.animation.currentView;
  }
  if (const auto *queued = queuedLayoutStartView(tag)) {
    return *queued;
  }
  return node->current;
}

// A detached ancestor is at the root, so the path from a view to the root ends at it on screen.
bool LayoutAnimationsProxy::endsPathOnScreen(
    const std::shared_ptr<LightNode> &pathNode,
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  return useViewsOnScreen && pathNode != node && pathNode->placement() == CarrierPlacement::AT_ROOT;
}

const ShadowView &LayoutAnimationsProxy::pathView(
    const std::shared_ptr<LightNode> &pathNode,
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  if (const auto *carried = endsPathOnScreen(pathNode, node, useViewsOnScreen) ? runOfCarrier(pathNode) : nullptr) {
    return carrierViewOnScreen(*carried);
  }
  return useViewsOnScreen ? viewOnScreen(pathNode) : pathNode->current;
}

// The offset of a scroll view moves the views in it, not the scroll view.
static react::Point scrollPosition(const std::shared_ptr<LightNode> &pathNode, const std::shared_ptr<LightNode> &node) {
  react::Point position;
  const auto &view = pathNode->current;
  if (pathNode != node && !strcmp(view.componentName, "ScrollView")) {
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
    const bool endsPath = endsPathOnScreen(currentNode, node, useViewsOnScreen);
    const auto &componentName = currentNode->current.componentName;
    react_native_assert(componentName && "Component name is nullptr");
    react::Point viewPosition = scrollPosition(currentNode, node);
    const auto &view = pathView(currentNode, node, useViewsOnScreen);
    const auto parent = currentNode->parent.lock();
    auto origin = view.layoutMetrics.frame.origin;
    // A screen below a header ends at the bottom of its stack. On Android, the frame of a new screen
    // can also start below the header until React Native Screens sends the native frame.
    if (parent && !strcmp(componentName, "RNSScreen") && currentNode->children.size() >= 2) {
      const auto &parentView = useViewsOnScreen ? viewOnScreen(parent) : parent->current;
      origin.y = parentView.layoutMetrics.frame.size.height - view.layoutMetrics.frame.size.height;
    }
    viewPosition += origin;
    viewsAbsolutePositions.emplace_back(viewPosition);
    currentNode = endsPath || (parent && isLayoutRoot(parent)) ? nullptr : parent;
  }
  for (int i = static_cast<int>(viewsAbsolutePositions.size()) - 2; i >= 0; --i) {
    viewsAbsolutePositions[i] += viewsAbsolutePositions[i + 1];
  }
  return viewsAbsolutePositions;
}

// UIKit can show a view outside the view of its React parent, for example in a presented modal.
std::optional<AncestorOutsideReactParent> LayoutAnimationsProxy::findAncestorOutsideReactParent(
    const std::vector<Ancestor> &ancestors,
    const bool settled) const {
#ifdef __APPLE__
  if (!nativeViewPlacement_) {
    return std::nullopt;
  }
  for (size_t i = 0; i + 1 < ancestors.size(); ++i) {
    // A detached carrier is in the overlay, and the paths of the views in it already end at the carrier.
    if (const auto nodeIt = lightNodes_.find(ancestors[i].tag);
        nodeIt != lightNodes_.end() && nodeIt->second->placement() == CarrierPlacement::AT_ROOT) {
      break;
    }
    const auto placement = nativeViewPlacement_(surfaceId_, ancestors[i].tag, ancestors[i + 1].tag, settled);
    if (placement.kind == NativeViewPlacement::Kind::OutsideReactParent) {
      return AncestorOutsideReactParent{
          .index = i, .position = ancestors[i].scrollPosition + placement.origin, .transform = placement.transform};
    }
  }
#endif
  return std::nullopt;
}

// The position of the ancestor from UIKit replaces the positions of the ancestors above it.
static void moveBelowAncestor(
    const AncestorOutsideReactParent &ancestor,
    std::vector<react::Point> &absolutePositions) {
  react_native_assert(ancestor.index < absolutePositions.size() && "Ancestor outside the absolute positions");
  const auto shift = ancestor.position - absolutePositions[ancestor.index];
  absolutePositions.resize(ancestor.index + 1);
  for (auto &position : absolutePositions) {
    position += shift;
  }
}

// Native views do not change during a pull.
void LayoutAnimationsProxy::adjustForNativePlacement(
    CollectedTransition &collectedTransition,
    const BeforeOrAfter index) const {
  const auto &ancestors = collectedTransition.ancestors[index];
  const auto ancestor = findAncestorOutsideReactParent(ancestors, index == AFTER);
  if (!ancestor) {
    return;
  }
  auto &absolutePositions = collectedTransition.absolutePositions[index];
  moveBelowAncestor(*ancestor, absolutePositions);
  collectedTransition.transition.snapshot[index].layoutMetrics.frame.origin = absolutePositions[0];
  collectedTransition.transition.transform[index] = parseParentTransforms(ancestors, absolutePositions, ancestor);
}

// A run that starts detaches its carrier, which ends the native placement search of the paths below it.
// The paths were collected before that, so all of them are adjusted before the first run starts.
void LayoutAnimationsProxy::adjustForNativePlacement(CollectedTransitions &transitions) const {
  for (auto &[_, collectedTransition] : transitions) {
    adjustForNativePlacement(collectedTransition, BEFORE);
    adjustForNativePlacement(collectedTransition, AFTER);
  }
}

NativeViewPlacement::Kind LayoutAnimationsProxy::nativePlacementKind(const std::shared_ptr<LightNode> &node) const {
#ifdef __APPLE__
  const auto parent = node ? node->parent.lock() : nullptr;
  if (parent && nativeViewPlacement_) {
    return nativeViewPlacement_(surfaceId_, node->current.tag, parent->current.tag, false).kind;
  }
#endif
  return NativeViewPlacement::Kind::InsideReactParent;
}

NativeViewPlacement::Kind LayoutAnimationsProxy::targetBoundaryPlacementKind(
    const std::shared_ptr<LightNode> &node) const {
  for (auto current = node; current; current = current->parent.lock()) {
    if (isSETBoundary(current)) {
      return nativePlacementKind(current);
    }
  }
  return nativePlacementKind(node);
}

// A source that left the screen before its transition starts, e.g. a sheet dismissed by a swipe, has nothing to fly
// from.
bool LayoutAnimationsProxy::isOffWindow(const std::shared_ptr<LightNode> &node) const {
  const auto placement = nativePlacementKind(node);
  return placement == NativeViewPlacement::Kind::OffWindow || placement == NativeViewPlacement::Kind::DifferentWindow;
}

// The carriers of a surface show in its window, so they cannot fly to a boundary in another window.
bool LayoutAnimationsProxy::isInOtherWindow(const std::shared_ptr<LightNode> &target) const {
  return targetBoundaryPlacementKind(target) == NativeViewPlacement::Kind::DifferentWindow;
}

void LayoutAnimationsProxy::waitForTargetWindow(SharedTransitionRun &run, const std::shared_ptr<LightNode> &target)
    const {
  run.targetOffWindow = targetBoundaryPlacementKind(target) == NativeViewPlacement::Kind::OffWindow;
  run.targetWindowDeadline = std::chrono::steady_clock::now() + kTargetWindowWait;
}

// Ends the run that still flies between the views of the shared tag, without landing.
void LayoutAnimationsProxy::endSharedTransitionOf(
    const SharedTag &sharedTag,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  if (auto *run = activeSharedTransitionRun(sharedTag)) {
    if (hasUnqueuedCarrierFrame(run->carrier->current.tag)) {
      retireSharedTransition(*run);
    } else {
      finishSharedTransition(*run, transaction, propsParserContext);
    }
  }
}

// The target in the space of the root, with the transforms of its ancestors.
ShadowView LayoutAnimationsProxy::targetOnScreen(
    const SharedTransitionRun &run,
    const PropsParserContext &propsParserContext) const {
  bool placedNatively = false;
  return targetOnScreen(run, propsParserContext, placedNatively);
}

ShadowView LayoutAnimationsProxy::targetOnScreen(
    const SharedTransitionRun &run,
    const PropsParserContext &propsParserContext,
    bool &placedNatively) const {
  resolveLightNodeProps(run.target);
  auto target = run.target->current;
  auto absolutePositions = getAbsolutePositionsForRootPathView(run.target, false);
  const auto ancestors = collectAncestors(run.target, false);
  const auto ancestor = findAncestorOutsideReactParent(ancestors, true);
  placedNatively = ancestor.has_value();
  if (ancestor) {
    moveBelowAncestor(*ancestor, absolutePositions);
  }
  target.layoutMetrics.frame.origin = absolutePositions[0];
  overrideTransform(target, parseParentTransforms(ancestors, absolutePositions, ancestor), propsParserContext);
  return target;
}

// A held start does not start, and a run does not land, until the target boundary joins the window. A run that
// follows its target flies to its end before it stops to wait.
void LayoutAnimationsProxy::followOffWindowTargets(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  for (auto &[_, run] : sharedTransitionRuns_) {
    if (run.lifecycle != SharedTransitionLifecycle::ACTIVE || !run.targetOffWindow) {
      continue;
    }
    const auto carrierTag = run.carrier->current.tag;
    const bool targetMapped = isLightNodeMapped(run.target);
    if (hasPendingLayoutAnimation(carrierTag) && (!targetMapped || run.target->isExiting())) {
      finishSharedTransition(run, transaction, propsParserContext, false);
      continue;
    }
    const auto placement = targetBoundaryPlacementKind(run.target);
    const bool targetOffWindow = targetMapped && placement == NativeViewPlacement::Kind::OffWindow;
    const bool waitsForWindow = targetOffWindow && !run.target->isExiting();
    const bool waitEnded = std::chrono::steady_clock::now() >= run.targetWindowDeadline && !carriesRunningRun(run) &&
        (!run.followsTarget || (!isQueuedOrRunning(layoutAnimationPhase(carrierTag)) && !landsWithOtherRuns(run)));
    if ((targetMapped && placement == NativeViewPlacement::Kind::DifferentWindow) || (waitsForWindow && waitEnded)) {
      transaction.restoreRequests.push_back({run.sharedTag, run.source});
      finishSharedTransition(run, transaction, propsParserContext, false);
      continue;
    }
    if (waitsForWindow) {
      schedulePullOnNextFrame();
      continue;
    }
    run.targetOffWindow = false;
    if (!targetMapped || targetOffWindow) {
      continue;
    }
    const auto &config = run.config;
    if (!config) {
      continue;
    }
    const auto target = targetInCarrierSpace(run, targetOnScreen(run, propsParserContext), propsParserContext);
    const auto carrierAfter = asCarrierView(target, run.carrier, propsParserContext);
    const auto frameProps = ownCarrierView(target, run.carrier, propsParserContext).props;
    if (hasPendingLayoutAnimation(carrierTag)) {
      run.followsTarget = run.configFollowsTarget;
      updateLayoutAnimationTarget(carrierTag, carrierAfter, frameProps, config, restartContentFade(run));
      continue;
    }
    if (run.followsTarget) {
      followSharedTransitionTarget(run, propsParserContext);
      continue;
    }
    if (!layoutAnimations_.contains(carrierTag) && !completedAnimations_.contains(carrierTag)) {
      continue;
    }
    const auto &animation = carrierAnimation(run);
    if (animation.finalView.layoutMetrics != carrierAfter.layoutMetrics ||
        getViewProps(animation.finalView).transform != getViewProps(carrierAfter).transform) {
      run.followsTarget = run.configFollowsTarget;
      startSharedTransition(
          run.carrier, animation.currentView, carrierAfter, frameProps, config, restartContentFade(run));
    }
  }
}

// A covered screen can get its native header frame after the gesture that uncovers it has started.
void LayoutAnimationsProxy::followProgressTargets(const PropsParserContext &propsParserContext) const {
  for (const auto &run : activeSharedTransitionRuns()) {
    if (run.driver != SharedTransitionDriver::GESTURE) {
      continue;
    }
    if (!isLightNodeMapped(run.target) || run.target->isExiting() || run.target->isCarrier()) {
      continue;
    }
    const auto carrierTag = run.carrier->current.tag;
    const auto animationIt = layoutAnimations_.find(carrierTag);
    if (animationIt == layoutAnimations_.end()) {
      continue;
    }
    const auto after = targetInCarrierSpace(run, targetOnScreen(run, propsParserContext), propsParserContext);
    const auto carrierAfter = asCarrierView(after, run.carrier, propsParserContext);
    const auto &finalView = animationIt->second.finalView;
    if (finalView.layoutMetrics != carrierAfter.layoutMetrics ||
        SharedTransitionValuesFactory::hasAnimatedChanges(getViewProps(finalView), getViewProps(carrierAfter))) {
      updateLayoutAnimationTarget(
          carrierTag, carrierAfter, ownCarrierView(after, run.carrier, propsParserContext).props, run.config);
    }
  }
}

std::vector<Ancestor> LayoutAnimationsProxy::collectAncestors(
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  std::vector<Ancestor> ancestors;
  auto currentNode = node;
  while (currentNode) {
    resolveLightNodeProps(currentNode);
    const bool endsPath = endsPathOnScreen(currentNode, node, useViewsOnScreen);
    const auto &view = pathView(currentNode, node, useViewsOnScreen);
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
        {currentNode->current.tag, scrollPosition(currentNode, node), props.transform, origin, viewSize});
    const auto parent = currentNode->parent.lock();
    currentNode = endsPath || (parent && isLayoutRoot(parent)) ? nullptr : parent;
  }
  return ancestors;
}

std::optional<Transform> LayoutAnimationsProxy::parseParentTransforms(
    const std::vector<Ancestor> &ancestors,
    const std::vector<react::Point> &absolutePositions,
    const std::optional<AncestorOutsideReactParent> &nativePlacement) const {
  const auto &targetSize = ancestors[0].ownSize;
  const auto &targetViewPosition = absolutePositions[0];
  Transform combinedMatrix;
  bool parentHasTransform = nativePlacement && nativePlacement->transform.matrix != Transform{}.matrix;
  if (parentHasTransform) {
    const auto &ancestor = ancestors[nativePlacement->index];
    const auto position = nativePlacement->position - ancestor.scrollPosition;
    TransformOrigin origin;
    origin.xy[0] = {static_cast<float>(position.x - targetViewPosition.x), UnitType::Point};
    origin.xy[1] = {static_cast<float>(position.y - targetViewPosition.y), UnitType::Point};
    combinedMatrix = resolveTransform(targetSize, ancestor.ownSize, nativePlacement->transform, origin);
  }
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
    // The absolute position of a scroll view above the shared view is the position of its content.
    const auto ancestorPosition = absolutePositions[i] - ancestor.scrollPosition;
    auto transformOrigin = ancestor.origin;
    transformOrigin.xy[0].value -= targetViewPosition.x - ancestorPosition.x;
    transformOrigin.xy[1].value -= targetViewPosition.y - ancestorPosition.y;
    combinedMatrix =
        combinedMatrix * resolveTransform(targetSize, ancestor.ownSize, ancestor.transform, transformOrigin);
    combinedMatrix.operations.clear();
  }
  if (parentHasTransform) {
    const auto origin = getTranslateForTransformOrigin(targetSize.width, targetSize.height, ancestors[0].origin);
    combinedMatrix = Transform::Translate(-origin[0], -origin[1], -origin[2]) * combinedMatrix *
        Transform::Translate(origin[0], origin[1], origin[2]);
    return Transform::FromTransformOperation(
        react::TransformOperation(TransformOperationType::Arbitrary), {}, combinedMatrix);
  }

  return {};
}

// The methods resolveTransform and getTranslateForTransformOrigin are sourced
// from:
// https://github.com/facebook/react-native/blob/v0.83.0/packages/react-native/ReactCommon/react/renderer/components/view/BaseViewProps.cpp#L588
// We need a copy of these methods to modify the `resolveTransform` method
// to accept the transform origin as a parameter instead of as a class field,
// and to resolve percent operations with the size of the view that owns them.
react::Transform LayoutAnimationsProxy::resolveTransform(
    const react::Size &originFrameSize,
    const react::Size &ownSize,
    const Transform &transform,
    const TransformOrigin &transformOrigin) const {
  auto transformMatrix = Transform{};
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
