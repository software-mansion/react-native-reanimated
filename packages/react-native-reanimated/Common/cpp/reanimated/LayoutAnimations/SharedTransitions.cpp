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
#include <array>
#include <iterator>
#include <ranges>
#include <unordered_set>
#include <utility>

namespace reanimated {

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
    ShadowView copy;
    std::optional<Transform> newTransform;
    std::vector<react::Point> absolutePositions;
    std::vector<Ancestor> ancestors;
    const auto carried = useViewsOnScreen && node->isDetached ? runOfCarrier(node) : std::nullopt;
    if (carried) {
      copy = carrierViewOnScreen(*carried->run);
    } else {
      copy = useViewsOnScreen ? viewOnScreen(node) : node->current;
      absolutePositions = getAbsolutePositionsForRootPathView(node, useViewsOnScreen);
      copy.layoutMetrics.frame.origin = absolutePositions[0];
      ancestors = collectAncestors(node, useViewsOnScreen);
      newTransform = parseParentTransforms(ancestors, absolutePositions);
    }

    auto &collectedTransition = transaction.transitionMap[*sharedTag];
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

      for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
        adjustForNativePlacement(collectedTransition, BEFORE);
        adjustForNativePlacement(collectedTransition, AFTER);
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
        if (isOffWindow(beforeNode)) {
          endSharedTransitionOf(sharedTag, transaction, propsParserContext);
          transaction.restoreRequests.push_back({sharedTag, beforeNode});
          transaction.restoreRequests.push_back({sharedTag, afterNode});
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
            true,
            sharedTransitionConfig ? sharedTransitionConfig->contentFade : std::nullopt,
            transaction,
            propsParserContext);
        restartContentFade(run);

        startProgressTransition(
            run.carrier->current.tag,
            run.carrierStartView,
            asCarrierView(after, run.carrier, propsParserContext),
            ownCarrierView(after, run.carrier, propsParserContext).props,
            config);
      }
      hideTransitioningViews(BEFORE, transaction, propsParserContext);
      hideTransitioningViews(AFTER, transaction, propsParserContext);
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
      finishSharedTransition(
          sharedTag, element.run, transaction, propsParserContext, transition_->state == TransitionState::END);
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
    const auto tag = element.run->carrier->current.tag;
    if (hasPendingLayoutAnimation(tag)) {
      continue;
    }
    const auto layoutAnimationIt = layoutAnimations_.find(tag);
    if (layoutAnimationIt == layoutAnimations_.end() ||
        layoutAnimationIt->second.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS) {
      continue;
    }
    auto &layoutAnimation = layoutAnimationIt->second;
    if (const auto &contentFade = element.run->contentFade) {
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
    const std::shared_ptr<Serializable> &config,
    const bool gestureDriven,
    const std::optional<SharedTransitionContentFade> &contentFade,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  auto &run = sharedElements_[sharedTag].run;
  if (run) {
    const auto &oldTarget = run->target;
    if (oldTarget != nodes[BEFORE] && oldTarget != nodes[AFTER]) {
      transaction.restoreRequests.push_back({sharedTag, oldTarget});
    }
    const auto tag = run->carrier->current.tag;
    const bool isAnimating = hasPendingLayoutAnimation(tag) || layoutAnimations_.contains(tag);
    const bool carrierChangedTag = !run->carrier->isRetained && findSharedTag(run->carrier->current) != sharedTag;
    const bool waitsToLand = completedAnimations_.contains(tag) && run->carrier->isRetained;
    if ((!isAnimating && !waitsToLand && !hasUnqueuedCarrierFrame(tag)) || carrierChangedTag) {
      react_native_assert((isAnimating || completedAnimations_.contains(tag)) && "Shared carrier has no animation");
      if (hasUnqueuedCarrierFrame(tag)) {
        retireSharedTransition(sharedTag, run);
      } else {
        attachCarrier(sharedTag, *run, transaction.filteredMutations, propsParserContext);
        run.reset();
      }
    }
  }
  if (!run) {
    const auto &carrier = nodes[BEFORE];
    // A view carries one run. Its shared tag can change while it carries the run of the old tag.
    // On Android, a frame of the old run can still be outside the mount queue here.
    if (const auto carried = carrier->isDetached ? runOfCarrier(carrier) : std::nullopt) {
      finishSharedTransition(carried->sharedTag, carried->run, transaction, propsParserContext);
    }
    run = SharedTransitionRun{.carrier = carrier};
    if (contentFade) {
      run->contentFade = ContentFade{.options = *contentFade, .range = {1, 1}};
    }
    detachCarrier(*run, carrierViewWithStyleOf(before, carrier, propsParserContext), transaction, propsParserContext);
  }
  run->source = nodes[BEFORE];
  run->target = nodes[AFTER];
  run->config = config;
  run->gestureDriven = gestureDriven;
  run->targetOffWindow = false;
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
  const auto &previousTarget = carrierAnimation(run).finalView;
  if (previousTarget.layoutMetrics != carrierTarget.layoutMetrics) {
    return true;
  }
  return SharedTransitionValuesFactory::hasAnimatedChanges(getViewProps(previousTarget), getViewProps(carrierTarget)) &&
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
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  const auto &node = run.carrier;
  const auto tag = node->current.tag;
  const auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  const auto mounted = mountedView(node);
  cancelLayoutAnimation(tag);
  const bool beforeScreenSnapshot = canDetachBeforeScreenSnapshot(node, transaction);
#ifdef ANDROID
  // React Native Screens holds what is left in a removed screen when it mounts the Remove, which is after the release.
  react_native_assert(
      !isInRemovedScreen(node, transaction.filteredMutations) &&
      "A carrier must move to the root before its screen is removed");
#endif
  ShadowViewMutationList mutations;
  mutations.push_back(
      ShadowViewMutation::RemoveMutation(parent->current.tag, mounted, parent->hostIndex(parent->positionOf(node))));
  addDetachedCarrier(node);
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
  ensureCarrierOverlay(mutations, propsParserContext);
  mutations.push_back(
      ShadowViewMutation::InsertMutation(carrierHostTag(), run.carrierStartView, carrierHostIndex(node)));
  mutations.push_back(ShadowViewMutation::UpdateMutation(mounted, run.carrierStartView, surfaceId_));

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
    const SharedTag &sharedTag,
    SharedTransitionRun &run,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  const auto node = run.carrier;
  if (node->isRetained) {
    endAnimationsRecursively(node, mutations, mutations);
    return;
  }
  const auto tag = node->current.tag;
  const auto mounted = carrierViewOnScreen(run);
  const auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  mutations.push_back(ShadowViewMutation::RemoveMutation(carrierHostTag(), mounted, carrierHostIndex(node)));
  removeDetachedCarrier(node);
  cancelLayoutAnimation(tag);

  resolveLightNodeProps(node);
  // React's Remove marks a carrier as exiting before its subtree removal runs, so a carrier can return
  // to its parent while it exits. Then it keeps its opacity and does not go back into its shared element.
  auto homeView = node->isExiting() ? node->current : cloneViewWithoutOpacity(node->current, propsParserContext);
#ifdef ANDROID
  homeView = resetPropsMissingFrom(homeView, mounted, propsParserContext);
#endif
  const auto parentTag = parent->current.tag;
  mutations.push_back(
      ShadowViewMutation::InsertMutation(parentTag, homeView, parent->hostIndex(parent->positionOf(node))));
  mutations.push_back(createPropsUpdate(mounted, homeView, parentTag, propsParserContext));
  if (!node->isExiting()) {
    hideInSharedElement(sharedTag, node);
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
  for (const auto &carrier : detachedCarriers_) {
    if (!carrier->isRetained && isInSubtree(carrier, node)) {
      carriers.push_back(carrier);
    }
  }
  for (const auto &carrier : carriers) {
    const auto parent = carrier->parent.lock();
    react_native_assert(parent && "A new retained carrier has a parent");
    parent->extractDetachedChild(carrier);
    carrier->isRetained = true;
  }
  for (const auto &carrier : carriers) {
    retainCarrierContent(carrier);
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
  return !detachedCarriers_.empty() && isInRetainedCarrier(node);
}

bool LayoutAnimationsProxy::defersSubtreeRemoval(const std::shared_ptr<LightNode> &node) const {
  if (std::ranges::any_of(detachedCarriers_, [&node](const auto &carrier) { return isInSubtree(carrier, node); })) {
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
  if (detachedCarriers_.empty()) {
    return {};
  }
  auto node = start;
  while (node && !node->isDetached) {
    node = node->parent.lock();
  }
  return node;
}

// A live carrier that retires because of a new shared tag keeps its frames, and its attach waits for them.
bool LayoutAnimationsProxy::isRetiringContent(const Tag tag) const {
  if (retiringSharedTransitions_.empty()) {
    return false;
  }
  const auto node = lightNodes_.find(tag);
  if (node == lightNodes_.end() || !node->second->isExiting()) {
    return false;
  }
  const auto carrier = detachedCarrierOf(node->second);
  return carrier && retiringSharedTransitions_.contains(carrier->current.tag);
}

void LayoutAnimationsProxy::retireOrphanedSharedTransitions() const {
  const auto isLive = [this](const auto &node) {
    return isLightNodeMapped(node) && !node->isExiting();
  };
  for (auto &[sharedTag, element] : sharedElements_) {
    if (element.run && !isLive(element.run->source) && !isLive(element.run->target)) {
      retireSharedTransition(sharedTag, element.run);
    }
  }
}

void LayoutAnimationsProxy::finishCoveredSharedTransitions(
    const std::shared_ptr<LightNode> &topScreen,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  for (auto &[sharedTag, element] : sharedElements_) {
    if (!element.run) {
      continue;
    }
    const auto &target = element.run->target;
    // A target that carries another run is at the root, above the screens.
    const bool carriesAnotherRun = target->isDetached && target != element.run->carrier;
    // Without an active boundary, the new screen covers every target.
    const bool onTopScreen = topScreen && isInSubtree(target, topScreen);
    if (!isLightNodeMapped(target) || target->isExiting() || carriesAnotherRun || onTopScreen) {
      continue;
    }
    if (hasUnqueuedCarrierFrame(element.run->carrier->current.tag)) {
      retireSharedTransition(sharedTag, element.run);
    } else {
      finishSharedTransition(sharedTag, element.run, transaction, propsParserContext);
    }
  }
}

void LayoutAnimationsProxy::retireSharedTransition(const SharedTag &sharedTag, std::optional<SharedTransitionRun> &run)
    const {
  const auto carrierTag = run->carrier->current.tag;
  const auto [it, inserted] = retiringSharedTransitions_.try_emplace(
      carrierTag, RetiringSharedTransition{.sharedTag = sharedTag, .run = std::nullopt});
  react_native_assert(inserted && "Carrier already has a retiring run");
  if (inserted) {
    it->second.run = std::exchange(run, std::nullopt);
  }
}

void LayoutAnimationsProxy::finishRetiringSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations) const {
  for (auto &[carrierTag, entry] : retiringSharedTransitions_) {
    auto &[sharedTag, run] = entry;
    if (run && flushStructuralMutations && !hasUnqueuedCarrierFrame(carrierTag)) {
      finishSharedTransition(sharedTag, run, transaction, propsParserContext);
    }
  }
  std::erase_if(retiringSharedTransitions_, [](const auto &entry) { return !entry.second.run; });
}

void LayoutAnimationsProxy::flushSubtreeRemovals(TransactionMeta &transaction) const {
  for (const auto &node : transaction.removedSubtrees) {
    if (isLightNodeMapped(node)) {
      handleSubtreeRemoval(node, transaction);
    }
  }
  if (transaction.surfaceDropped) {
    const auto carriers = detachedCarriers_;
    for (const auto &carrier : carriers) {
      if (isLightNodeMapped(carrier) && carrier->isRetained) {
        endAnimationsRecursively(carrier, transaction.filteredMutations, transaction.filteredMutations);
      }
    }
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
  react_native_assert((parent || node->isRetained) && "Parent node is nullptr");
  if (node->isDetached) {
    const auto carried = runOfCarrier(node);
    const auto &carrierView = carried ? carrierViewOnScreen(*carried->run) : node->current;
    rootMutations.push_back(ShadowViewMutation::RemoveMutation(carrierHostTag(), carrierView, carrierHostIndex(node)));
    removeDetachedCarrier(node);
    if (carried) {
      deferRestore({carried->sharedTag, carried->run->target});
      carried->run.reset();
    }
  } else {
    const auto position = parent->positionOf(node);
    react_native_assert(position != -1 && "Removed node not found in its parent");
    auto &parentMutations = parent->current.tag == surfaceId_ ? rootMutations : mutations;
    parentMutations.push_back(
        ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, parent->hostIndex(position)));
  }
  if (parent) {
    parent->removeChild(node);
  }
  cancelLayoutAnimation(node->current.tag);
}

void LayoutAnimationsProxy::addDetachedCarrier(const std::shared_ptr<LightNode> &node) const {
  node->setDetached(true);
  detachedCarriers_.push_back(node);
}

void LayoutAnimationsProxy::removeDetachedCarrier(const std::shared_ptr<LightNode> &node) const {
  std::erase(detachedCarriers_, node);
  node->setDetached(false);
}

// Detached carriers follow the children of the root, or live in the overlay on iOS.
int LayoutAnimationsProxy::carrierHostIndex(const std::shared_ptr<LightNode> &node) const {
  const auto carrierIt = std::ranges::find(detachedCarriers_, node);
  react_native_assert(carrierIt != detachedCarriers_.end() && "The node is not a detached carrier");
  const auto index = static_cast<int>(std::distance(detachedCarriers_.begin(), carrierIt));
#ifdef __APPLE__
  if (carrierOverlay_) {
    return index;
  }
#endif
  const auto root = lightNodes_.at(surfaceId_);
  return root->hostIndex(static_cast<int>(root->children.size())) + index;
}

Tag LayoutAnimationsProxy::carrierHostTag() const {
#ifdef __APPLE__
  if (carrierOverlay_) {
    return carrierOverlay_->current.tag;
  }
#endif
  return surfaceId_;
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
    sharedTransitionManager_->nextOverlayTag_ += 2;
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

std::optional<CarrierRun> LayoutAnimationsProxy::runOfCarrier(const std::shared_ptr<LightNode> &node) const {
  if (const auto it = retiringSharedTransitions_.find(node->current.tag);
      it != retiringSharedTransitions_.end() && it->second.run && it->second.run->carrier == node) {
    return CarrierRun{it->second.sharedTag, it->second.run};
  }
  const auto elementIt = std::ranges::find_if(sharedElements_, [&node](const auto &entry) {
    const auto &run = entry.second.run;
    return run && run->carrier == node;
  });
  react_native_assert(elementIt != sharedElements_.end() && "The node is not a carrier");
  if (elementIt == sharedElements_.end()) {
    return std::nullopt;
  }
  return CarrierRun{elementIt->first, elementIt->second.run};
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
    for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
      adjustForNativePlacement(collectedTransition, BEFORE);
      adjustForNativePlacement(collectedTransition, AFTER);
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;
      const auto &transform = transition.transform;
      overrideTransform(before, transform[BEFORE], propsParserContext);
      overrideTransform(after, transform[AFTER], propsParserContext);
      const auto config = layoutAnimationsManager_->getSharedTransitionConfig(before.tag);
      const bool sourceOffWindow = isOffWindow(collectedTransition.nodes[BEFORE]);
      if (sourceOffWindow) {
        endSharedTransitionOf(sharedTag, transaction, propsParserContext);
      }
      if (!config || sourceOffWindow) {
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
      auto &run = startSharedTransitionRun(
          before,
          sharedTag,
          collectedTransition.nodes,
          config->animation,
          false,
          config->contentFade,
          transaction,
          propsParserContext);

      startSharedTransition(
          run.carrier->current.tag,
          run.carrierStartView,
          asCarrierView(after, run.carrier, propsParserContext),
          ownCarrierView(after, run.carrier, propsParserContext).props,
          config->animation,
          restartContentFade(run));
      run.targetOffWindow = isOffWindow(afterNode);
      if (run.targetOffWindow) {
        schedulePullOnNextFrame();
      }
    }
    finishCoveredSharedTransitions(afterTopScreen, transaction, propsParserContext);
  } else if (!mutations.empty()) {
    for (auto &[sharedTag, collectedTransition] : transaction.transitions) {
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;

      const auto elementIt = sharedElements_.find(sharedTag);
      if (elementIt == sharedElements_.end() || !elementIt->second.run) {
        continue;
      }
      auto &run = *elementIt->second.run;
      const auto carrierTag = run.carrier->current.tag;
      if (!hasPendingLayoutAnimation(carrierTag) && !layoutAnimations_.contains(carrierTag) &&
          !completedAnimations_.contains(carrierTag)) {
        continue;
      }
      const auto config = layoutAnimationsManager_->getSharedTransitionConfig(before.tag);
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
        if (!afterNode->isDetached) {
          hideInSharedElement(sharedTag, afterNode);
          transaction.filteredMutations.push_back(createPropsUpdate(
              after,
              cloneViewWithoutOpacity(after, propsParserContext),
              transition.parentTag[AFTER],
              propsParserContext));
        }
      }
      run.target = afterNode;
      run.config = config->animation;
      adjustForNativePlacement(collectedTransition, AFTER);
      overrideTransform(after, transition.transform[AFTER], propsParserContext);
      const auto carrierAfter = asCarrierView(after, run.carrier, propsParserContext);
      if (hasPendingLayoutAnimation(carrierTag)) {
        updateLayoutAnimationTarget(
            carrierTag,
            carrierAfter,
            ownCarrierView(after, run.carrier, propsParserContext).props,
            config->animation,
            restartContentFade(run));
        continue;
      }
      if (targetEndChanged(run, carrierAfter)) {
        startSharedTransition(
            carrierTag,
            carrierAnimation(run).currentView,
            carrierAfter,
            ownCarrierView(after, run.carrier, propsParserContext).props,
            config->animation,
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
    if (node->isDetached) {
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

// A view in a hidden view does not show. When the target of a run is in a view that a continuing run hides,
// the carrier stays on screen until that run ends, because the target cannot show before then.
void LayoutAnimationsProxy::finishEndedSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations,
    std::unordered_set<Tag> &preservedTags) const {
  const auto coveringViews = viewsHiddenByContinuingRuns();
  for (auto &[sharedTag, element] : sharedElements_) {
    if (!element.run) {
      continue;
    }
    const auto tag = element.run->carrier->current.tag;
    if (!hasCarrierAnimationEnded(tag)) {
      continue;
    }
    // The carrier lands on the target only after the platform places the target.
    if (!flushStructuralMutations || runContinues(tag) || isDescendantOfAny(element.run->target, coveringViews) ||
        element.run->targetOffWindow) {
      preservedTags.insert(tag);
      continue;
    }
    finishSharedTransition(sharedTag, element.run, transaction, propsParserContext, true);
  }
}

bool LayoutAnimationsProxy::hasCarrierAnimationEnded(const Tag tag) const {
  return completedAnimations_.contains(tag) && !hasPendingLayoutAnimation(tag);
}

bool LayoutAnimationsProxy::waitsForCoveringRun(
    const SharedTransitionRun &run,
    const std::vector<std::shared_ptr<LightNode>> &coveringViews) const {
  return hasCarrierAnimationEnded(run.carrier->current.tag) && isDescendantOfAny(run.target, coveringViews);
}

bool LayoutAnimationsProxy::runContinues(const Tag carrierTag) const {
  return !hasCarrierAnimationEnded(carrierTag) || hasUnqueuedCarrierFrame(carrierTag);
}

std::vector<std::shared_ptr<LightNode>> LayoutAnimationsProxy::viewsHiddenByContinuingRuns() const {
  std::vector<std::shared_ptr<LightNode>> views;
  for (const auto &[_, element] : sharedElements_) {
    if (!element.run) {
      continue;
    }
    if (!runContinues(element.run->carrier->current.tag)) {
      continue;
    }
    for (const auto &hiddenView : element.hiddenViews) {
      views.push_back(hiddenView.node);
    }
  }
  return views;
}

void LayoutAnimationsProxy::finishSharedTransition(
    const SharedTag &sharedTag,
    std::optional<SharedTransitionRun> &run,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool landed) const {
  // attachCarrier can end the run through removeFromParent, so the run stays in its map until then.
  auto finishedRun = *run;
  const bool targetGone = !isLightNodeMapped(finishedRun.target) || finishedRun.target->isExiting();
  // A gesture-driven run leaves its source to the screen pop.
  transaction.restoreRequests.push_back(
      {sharedTag, finishedRun.target, finishedRun.gestureDriven ? nullptr : finishedRun.source});
  attachCarrier(sharedTag, finishedRun, transaction.filteredMutations, propsParserContext);
  if (landed && !targetGone && finishedRun.contentFade && finishedRun.carrier != finishedRun.target) {
    fadeInTargetContent(finishedRun, transaction, propsParserContext);
  }
  run.reset();
  if (!heldEnterings_.empty()) {
    schedulePullOnNextFrame();
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

std::vector<std::shared_ptr<LightNode>> LayoutAnimationsProxy::fadingChildren(
    const std::shared_ptr<LightNode> &node,
    const std::unordered_set<Tag> &hiddenTags) const {
  std::vector<std::shared_ptr<LightNode>> children;
  for (const auto &child : node->children) {
    if (isLightNodeMapped(child) && !child->isDetached && isViewKind(child->current) &&
        !hiddenTags.contains(child->current.tag)) {
      children.push_back(child);
    }
  }
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
  if (hasPendingLayoutAnimation(tag) || layoutAnimations_.contains(tag) || completedAnimations_.contains(tag)) {
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
    const std::shared_ptr<LightNode> &child,
    const double fromContentOpacity,
    const double toContentOpacity,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  const auto tag = child->current.tag;
  auto mountedContentOpacity = fromContentOpacity;
  for (auto &mutation : mutations) {
    if ((mutation.type != ShadowViewMutation::Update && mutation.type != ShadowViewMutation::Insert) ||
        mutation.newChildShadowView.tag != tag) {
      continue;
    }
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
  const auto parent = child->parent.lock();
  mutations.push_back(createPropsUpdate(
      withContentOpacity(child, view, fromContentOpacity, propsParserContext),
      withContentOpacity(child, view, toContentOpacity, propsParserContext),
      parent ? parent->current.tag : surfaceId_,
      propsParserContext));
}

// A retiring run keeps the fade of its children until its carrier attaches.
std::vector<SharedTransitionRun *> LayoutAnimationsProxy::contentFadeRuns() const {
  std::vector<SharedTransitionRun *> runs;
  const auto addRun = [&runs](std::optional<SharedTransitionRun> &run) {
    if (run && run->contentFade) {
      runs.push_back(&*run);
    }
  };
  for (auto &[_, element] : sharedElements_) {
    addRun(element.run);
  }
  for (auto &[_, retiring] : retiringSharedTransitions_) {
    addRun(retiring.run);
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
      const auto tag = child->current.tag;
      const auto shownOpacity = contentFade.fadedChildren.contains(tag) ? contentFade.mountedOpacity : 1.0;
      applyContentOpacity(child, shownOpacity, opacity, filteredMutations, propsParserContext);
      contentFade.fadedChildren[tag] = child;
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
  std::erase_if(contentFade.fadedChildren, [&](const auto &entry) {
    const auto &[tag, child] = entry;
    if (std::ranges::find(keptChildren, child) != keptChildren.end()) {
      return false;
    }
    if (isLightNodeMapped(child) && !hiddenTags.contains(tag)) {
      applyContentOpacity(child, contentFade.mountedOpacity, 1, mutations, propsParserContext);
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
  const auto targetContent = fadingTargetContent();
  std::erase_if(heldEnterings_, [&](const PendingNodeAnimation &held) {
    if (!isLightNodeMapped(held.node)) {
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
  for (const auto &[_, element] : sharedElements_) {
    const auto &run = element.run;
    if (!run || !run->contentFade || run->carrier == run->target) {
      continue;
    }
    if (!hiddenTags) {
      hiddenTags = hiddenViewTags();
    }
    std::ranges::copy(fadingChildren(run->target, *hiddenTags), std::inserter(content, content.end()));
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
    if (child->isExiting() || hasPendingLayoutAnimation(tag) || layoutAnimations_.contains(tag)) {
      continue;
    }
    const auto &view = mountedView(child);
    transaction.filteredMutations.push_back(createPropsUpdate(
        view, cloneViewWithOpacity(view, 0, propsParserContext), run.target->current.tag, propsParserContext));
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
  for (const auto &pendingRequest : transaction.restoreRequests) {
    ReanimatedSystraceSection s("Restore tag");
    const auto request = withShownEndpoint(pendingRequest);
    const auto &node = request.node;
    if (isInSharedTransition(node)) {
      deferRestore(request);
      continue;
    }
    if (node->isDetached || !showHiddenView(request) || !isLightNodeMapped(node)) {
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
    react_native_assert(detachedCarriers_.empty() && "The last pull of a surface removes its carriers");
    setSharedTransitionOverlay_(surfaceId_, std::nullopt);
    filteredMutations.push_back(ShadowViewMutation::DeleteMutation(carrierOverlay_->current));
    carrierOverlay_.reset();
  }
#endif

  std::erase_if(sharedElements_, [](const auto &entry) {
    const auto &element = entry.second;
    return !element.run && element.hiddenViews.empty();
  });
}

// MARK: Position Calculation

// A running or queued layout animation keeps the frame that is on screen in its own record.
// The light node holds the committed layout, which the animation has not reached yet.
// The record of a detached carrier is relative to the root, so its place under its parent
// is the committed layout.
const ShadowView &LayoutAnimationsProxy::viewOnScreen(const std::shared_ptr<LightNode> &node) const {
  if (node->isDetached) {
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
  return useViewsOnScreen && pathNode != node && pathNode->isDetached;
}

const ShadowView &LayoutAnimationsProxy::pathView(
    const std::shared_ptr<LightNode> &pathNode,
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  if (const auto carried = endsPathOnScreen(pathNode, node, useViewsOnScreen) ? runOfCarrier(pathNode) : std::nullopt) {
    return carrierViewOnScreen(*carried->run);
  }
  return useViewsOnScreen ? viewOnScreen(pathNode) : pathNode->current;
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
    const bool endsPath = endsPathOnScreen(currentNode, node, useViewsOnScreen);
    const auto &componentName = currentNode->current.componentName;
    react_native_assert(componentName && "Component name is nullptr");
    react::Point viewPosition = scrollPosition(currentNode->current);
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
    currentNode = endsPath ? nullptr : parent;
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
        nodeIt != lightNodes_.end() && nodeIt->second->isDetached) {
      break;
    }
    const auto placement = nativeViewPlacement_(surfaceId_, ancestors[i].tag, ancestors[i + 1].tag, settled);
    if (placement.kind == NativeViewPlacement::Kind::OutsideReactParent) {
      return AncestorOutsideReactParent{.index = i, .position = ancestors[i].scrollPosition + placement.origin};
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
  collectedTransition.transition.transform[index] = parseParentTransforms(ancestors, absolutePositions);
}

// A source that left the screen before its transition starts, e.g. a sheet dismissed by a swipe, has nothing to fly
// from.
bool LayoutAnimationsProxy::isOffWindow(const std::shared_ptr<LightNode> &node) const {
#ifdef __APPLE__
  const auto parent = node ? node->parent.lock() : nullptr;
  return parent && nativeViewPlacement_ &&
      nativeViewPlacement_(surfaceId_, node->current.tag, parent->current.tag, false).kind ==
      NativeViewPlacement::Kind::OffWindow;
#else
  return false;
#endif
}

// Ends the run that still flies between the views of the shared tag, without landing.
void LayoutAnimationsProxy::endSharedTransitionOf(
    const SharedTag &sharedTag,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  const auto elementIt = sharedElements_.find(sharedTag);
  if (elementIt != sharedElements_.end() && elementIt->second.run) {
    finishSharedTransition(sharedTag, elementIt->second.run, transaction, propsParserContext);
  }
}

// A target that is not mounted or presented yet is measured in the shadow tree, which places a presented screen at the
// origin of its stack. The run follows the target once the platform places it, until the transition ends.
void LayoutAnimationsProxy::followOffWindowTargets(const PropsParserContext &propsParserContext) const {
  for (auto &[_, element] : sharedElements_) {
    if (!element.run || !element.run->targetOffWindow) {
      continue;
    }
    auto &run = *element.run;
    const auto carrierTag = run.carrier->current.tag;
    const bool targetMapped = isLightNodeMapped(run.target);
    const bool targetOffWindow = targetMapped && isOffWindow(run.target);
    if (targetOffWindow && (hasPendingLayoutAnimation(carrierTag) || layoutAnimations_.contains(carrierTag))) {
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
    resolveLightNodeProps(run.target);
    auto after = run.target->current;
    auto absolutePositions = getAbsolutePositionsForRootPathView(run.target, false);
    const auto ancestors = collectAncestors(run.target, false);
    if (const auto ancestor = findAncestorOutsideReactParent(ancestors, true)) {
      moveBelowAncestor(*ancestor, absolutePositions);
    }
    after.layoutMetrics.frame.origin = absolutePositions[0];
    overrideTransform(after, parseParentTransforms(ancestors, absolutePositions), propsParserContext);
    const auto carrierAfter = asCarrierView(after, run.carrier, propsParserContext);
    const auto frameProps = ownCarrierView(after, run.carrier, propsParserContext).props;
    if (hasPendingLayoutAnimation(carrierTag)) {
      updateLayoutAnimationTarget(carrierTag, carrierAfter, frameProps, config, restartContentFade(run));
      continue;
    }
    if (!layoutAnimations_.contains(carrierTag) && !completedAnimations_.contains(carrierTag)) {
      continue;
    }
    const auto &animation = carrierAnimation(run);
    if (animation.finalView.layoutMetrics != carrierAfter.layoutMetrics) {
      startSharedTransition(
          carrierTag, animation.currentView, carrierAfter, frameProps, config, restartContentFade(run));
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
        {currentNode->current.tag, scrollPosition(currentNode->current), props.transform, origin, viewSize});
    currentNode = endsPath ? nullptr : currentNode->parent.lock();
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
