#include <folly/dynamic.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/PropsDiffer.h>
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
// The style props that PropsDiffer animates.
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
// A fade-out ends at fadeOutEnd of the move. A fade-in lasts the whole move.
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
    const auto carried = useViewsOnScreen && node->isDetached ? sharedElementOfCarrier(node) : std::nullopt;
    if (carried) {
      copy = carrierViewOnScreen(*carried->element.run);
    } else {
      copy = useViewsOnScreen ? viewOnScreen(node) : node->current;
      const auto absolutePositions = getAbsolutePositionsForRootPathView(node, useViewsOnScreen);
      copy.layoutMetrics.frame.origin = absolutePositions[0];
      newTransform = parseParentTransforms(node, absolutePositions, useViewsOnScreen);
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

        auto &run = startSharedTransitionRun(
            before, sharedTag, collectedTransition.nodes, true, transaction, propsParserContext);
        restartContentFade(run);

        const auto target = targetInCarrierSpace(run, after);
        startProgressTransition(
            run.carrier,
            run.carrierStartView,
            asCarrierView(target, run.carrier, propsParserContext),
            ownCarrierView(target, run.carrier, propsParserContext).props);
      }
      hideTransitioningViews(BEFORE, transaction, propsParserContext);
      hideTransitioningViews(AFTER, transaction, propsParserContext);
    }
  } else if (transition_->state == TransitionState::ACTIVE) {
    for (const auto &[_, element] : sharedElements_) {
      if (!element.run || !element.run->gestureDriven) {
        continue;
      }
      const auto tag = element.run->carrier->current.tag;
      if (hasPendingLayoutAnimation(tag)) {
        continue;
      }
      const auto layoutAnimationIt = layoutAnimations_.find(tag);
      if (layoutAnimationIt == layoutAnimations_.end()) {
        react_native_assert(false && "Shared transition animation not found");
        continue;
      }
      auto &layoutAnimation = layoutAnimationIt->second;
      if (const auto &contentFade = element.run->contentFade) {
        const auto &[from, to] = contentFade->range;
        const auto fadeProgress = std::clamp(transition_->progress / fadeLength(*contentFade), 0.0, 1.0);
        layoutAnimation.contentOpacity = from + fadeProgress * (to - from);
      }
      auto before = layoutAnimation.startView.layoutMetrics.frame;
      auto after = layoutAnimation.finalView.layoutMetrics.frame;
      auto x = before.origin.x + transition_->progress * (after.origin.x - before.origin.x);
      auto y = before.origin.y + transition_->progress * (after.origin.y - before.origin.y);
      auto width = before.size.width + transition_->progress * (after.size.width - before.size.width);
      auto height = before.size.height + transition_->progress * (after.size.height - before.size.height);

      auto beforeProps = std::static_pointer_cast<const BaseViewProps>(layoutAnimation.startView.props);
      auto afterProps = std::static_pointer_cast<const BaseViewProps>(layoutAnimation.finalView.props);
      auto beforeRadius = beforeProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point)).value;
      auto afterRadius = afterProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point)).value;

      // TODO (future): Support more props in progress transitions.
      auto borderRadiusDynamic =
          folly::dynamic::object("borderRadius", beforeRadius + transition_->progress * (afterRadius - beforeRadius));

#ifdef RN_SERIALIZABLE_STATE
      // TODO (future): Support borderRadius on Android.
      const Props::Shared newProps = nullptr;
#else
      auto rawProps = RawProps(std::move(borderRadiusDynamic));

      auto newProps = componentDescriptorRegistry_->at(layoutAnimation.finalView.componentHandle)
                          .cloneProps(propsParserContext, layoutAnimation.framePropsBase(), std::move(rawProps));
#endif

      updateMap_.insert_or_assign(tag, UpdateValues{newProps, {x, y, width, height}});
    }
  }

  if (transition_->state == TransitionState::START) {
    transition_->state = TransitionState::ACTIVE;
  } else if (transition_->state == TransitionState::END || transition_->state == TransitionState::CANCELLED) {
    std::vector<RestoreRequest> sources;
    for (const auto &[sharedTag, element] : sharedElements_) {
      if (element.run && element.run->gestureDriven) {
        sources.push_back({sharedTag, element.run->source});
      }
    }
    for (auto &[sharedTag, element] : sharedElements_) {
      if (element.run && element.run->gestureDriven) {
        finishSharedTransition(
            sharedTag, element, transaction, propsParserContext, transition_->state == TransitionState::END);
      }
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

// A new run moves its source. A continuing run keeps the view that already moves.
SharedTransitionRun &LayoutAnimationsProxy::startSharedTransitionRun(
    const ShadowView &before,
    const SharedTag &sharedTag,
    const std::array<std::shared_ptr<LightNode>, 2> &nodes,
    const bool gestureDriven,
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
    const bool waitsToLand =
        completedAnimations_.contains(tag) && (run->carrier->isRetained || landsWithOtherRuns(*run));
    if ((!isAnimating && !waitsToLand && !hasUnqueuedCarrierFrame(tag)) || carrierChangedTag) {
      react_native_assert((isAnimating || completedAnimations_.contains(tag)) && "Shared carrier has no animation");
      if (hasUnqueuedCarrierFrame(tag)) {
        retireSharedTransition(sharedTag, sharedElements_[sharedTag]);
      } else {
        finishNestedSharedTransitions(run->carrier, transaction, propsParserContext, false);
        attachCarrier(sharedTag, *run, transaction.filteredMutations, propsParserContext);
        run.reset();
      }
    }
  }
  if (!run) {
    const auto &carrier = nodes[BEFORE];
    // A view carries one run. Its shared tag can change while it carries the run of the old tag.
    // On Android, a frame of the old run can still be outside the mount queue here.
    if (const auto carried = carrier->isCarrier() ? sharedElementOfCarrier(carrier) : std::nullopt) {
      finishSharedTransition(carried->sharedTag, carried->element, transaction, propsParserContext);
    }
    run = SharedTransitionRun{.carrier = carrier};
    if (const auto options = layoutAnimationsManager_->getSharedTransitionContentFade(before.tag)) {
      run->contentFade = ContentFade{.options = *options, .range = {1, 1}};
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
  run->gestureDriven = gestureDriven;
  if (run->carrier->isNestedCarrier && !keepsNesting(run->carrier, run->target)) {
    moveNestedCarrierToRoot(*run, transaction.filteredMutations);
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
  const auto &previousTarget = carrierAnimation(run).finalView;
  if (previousTarget.layoutMetrics != carrierTarget.layoutMetrics) {
    return true;
  }
  return PropsDiffer::hasAnimatedChanges(getViewProps(previousTarget), getViewProps(carrierTarget)) &&
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

// The animation starts from the style of the source, so the carrier starts with that style and with its
// own content.
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
    node->isNestedCarrier = true;
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
    node->setDetached(true);
    detachedCarriers_.push_back(node);
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
  if (!nested) {
    mutations.push_back(ShadowViewMutation::InsertMutation(surfaceId_, run.carrierStartView, carrierHostIndex(node)));
  }
  mutations.push_back(ShadowViewMutation::UpdateMutation(mounted, run.carrierStartView, carrierParentTag(node)));

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
  const bool detached = node->isDetached;
  if (detached) {
    mutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId_, mounted, carrierHostIndex(node)));
    std::erase(detachedCarriers_, node);
    node->setDetached(false);
  }
  node->isNestedCarrier = false;
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

// A removed subtree waits for the shared transitions of this pull when it holds a detached carrier or a
// tagged view of the top screen, which can become a source.
bool LayoutAnimationsProxy::defersSubtreeRemoval(const std::shared_ptr<LightNode> &node) const {
  if (std::ranges::any_of(detachedCarriers_, [&node](const auto &carrier) { return isInSubtree(carrier, node); })) {
    return true;
  }
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
  for (auto node = carrierAncestorOf(carrier); node; node = node->isDetached ? nullptr : carrierAncestorOf(node)) {
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
  return ancestor && isInSubtree(target, sharedElementOfCarrier(ancestor)->element.run->target);
}

// The carrier keeps its frame on screen, and its animation continues in the space of the root.
void LayoutAnimationsProxy::moveNestedCarrierToRoot(SharedTransitionRun &run, ShadowViewMutationList &mutations) const {
  const auto &node = run.carrier;
  const auto tag = node->current.tag;
  const auto parent = node->parent.lock();
  const auto offset = originOnScreen(parent);
  const auto mounted = carrierViewOnScreen(run);
  mutations.push_back(
      ShadowViewMutation::RemoveMutation(parent->current.tag, mounted, parent->hostIndex(parent->positionOf(node))));
  node->isNestedCarrier = false;
  node->setDetached(true);
  detachedCarriers_.push_back(node);
  run.carrierStartView.layoutMetrics.frame.origin += offset;
  auto view = mounted;
  view.layoutMetrics.frame.origin += offset;
  view = reparentLayoutAnimation(tag, surfaceId_, movedCarrierTarget(tag, offset), offset).value_or(view);
  mutations.push_back(ShadowViewMutation::InsertMutation(surfaceId_, view, carrierHostIndex(node)));
}

// React removes a view between a nested carrier and the carrier that moves it, so the nested carrier moves on from
// the root, where the removal keeps it.
void LayoutAnimationsProxy::moveNestedCarriersOutOf(
    const std::shared_ptr<LightNode> &node,
    TransactionMeta &transaction) const {
  for (auto &[_, element] : sharedElements_) {
    auto &run = element.run;
    if (run && run->carrier->isNestedCarrier && isLinkedInSubtree(run->carrier, node) &&
        !isInSubtree(carrierAncestorOf(run->carrier), node)) {
      moveNestedCarrierToRoot(*run, transaction.filteredMutations);
    }
  }
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
  return carrier->isDetached ? surfaceId_ : carrier->parent.lock()->current.tag;
}

// The parent of a nested carrier keeps its place in the carrier that moves it, which ends at its own target.
// So the nested carrier ends where its target is in that target, with the transforms of its own target only.
ShadowView LayoutAnimationsProxy::targetInCarrierSpace(const SharedTransitionRun &run, const ShadowView &target) const {
  if (!run.carrier->isNestedCarrier) {
    return target;
  }
  const auto ancestor = carrierAncestorOf(run.carrier);
  react_native_assert(ancestor && "A nested carrier moves in a carrier");
  if (!ancestor) {
    return target;
  }
  const auto &ancestorTarget = sharedElementOfCarrier(ancestor)->element.run->target;
  resolveLightNodeProps(run.target);
  auto view = target;
  view.props = run.target->current.props;
  view.layoutMetrics.frame.origin =
      positionIn(run.target, ancestorTarget, false) - positionIn(run.carrier->parent.lock(), ancestor, true);
  return view;
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
  if (const auto carried = node->isDetached ? sharedElementOfCarrier(node) : std::nullopt) {
    return carrierViewOnScreen(*carried->element.run).layoutMetrics.frame.origin;
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
      retireSharedTransition(sharedTag, element);
    }
  }
}

// The new top screen covers a target that is in another screen. Without an active boundary, it covers every target.
// Its run ends, so that its carrier does not move over the new screen. A target that carries another run is at the
// root, above the screens.
void LayoutAnimationsProxy::finishCoveredSharedTransitions(
    const std::shared_ptr<LightNode> &topScreen,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  for (auto &[sharedTag, element] : sharedElements_) {
    if (!element.run) {
      continue;
    }
    const auto &target = element.run->target;
    const bool carriesAnotherRun = target->isCarrier() && target != element.run->carrier;
    const bool onTopScreen = topScreen && isInSubtree(target, topScreen);
    const bool movesWithAncestor = element.run->carrier->isNestedCarrier && carrierAncestorOf(element.run->carrier);
    if (!isLightNodeMapped(target) || target->isExiting() || carriesAnotherRun || onTopScreen || movesWithAncestor) {
      continue;
    }
    if (hasUnqueuedCarrierFrame(element.run->carrier->current.tag)) {
      retireSharedTransition(sharedTag, element);
    } else {
      finishSharedTransition(sharedTag, element, transaction, propsParserContext);
    }
  }
}

void LayoutAnimationsProxy::retireSharedTransition(const SharedTag &sharedTag, SharedElement &element) const {
  const auto carrierTag = element.run->carrier->current.tag;
  const auto [it, inserted] = retiringSharedTransitions_.try_emplace(
      carrierTag, RetiringSharedTransition{.sharedTag = sharedTag, .element = {}});
  react_native_assert(inserted && "Carrier already has a retiring run");
  if (inserted) {
    it->second.element.run = std::exchange(element.run, std::nullopt);
  }
}

void LayoutAnimationsProxy::finishRetiringSharedTransitions(
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool flushStructuralMutations) const {
  for (auto &[carrierTag, entry] : retiringSharedTransitions_) {
    auto &[sharedTag, element] = entry;
    if (element.run && flushStructuralMutations && !hasUnqueuedCarrierFrame(carrierTag)) {
      finishSharedTransition(sharedTag, element, transaction, propsParserContext, false);
    }
  }
  std::erase_if(retiringSharedTransitions_, [](const auto &entry) { return !entry.second.element.run; });
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
  const auto carried = node->isCarrier() ? sharedElementOfCarrier(node) : std::nullopt;
  if (carried) {
    deferRestore({carried->sharedTag, carried->element.run->target});
  }
  node->isNestedCarrier = false;
  if (node->isDetached) {
    const auto &carrierView = carried ? carrierViewOnScreen(*carried->element.run) : node->current;
    rootMutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId_, carrierView, carrierHostIndex(node)));
    std::erase(detachedCarriers_, node);
    node->setDetached(false);
  } else {
    const auto position = parent->positionOf(node);
    react_native_assert(position != -1 && "Removed node not found in its parent");
    auto &parentMutations = parent->current.tag == surfaceId_ ? rootMutations : mutations;
    parentMutations.push_back(
        ShadowViewMutation::RemoveMutation(parent->current.tag, node->current, parent->hostIndex(position)));
  }
  if (carried) {
    carried->element.run.reset();
  }
  if (parent) {
    parent->removeChild(node);
  }
  cancelLayoutAnimation(node->current.tag);
}

int LayoutAnimationsProxy::carrierHostIndex(const std::shared_ptr<LightNode> &node) const {
  const auto root = lightNodes_.at(surfaceId_);
  const auto carrierIt = std::ranges::find(detachedCarriers_, node);
  react_native_assert(carrierIt != detachedCarriers_.end() && "The node is not a detached carrier");
  const auto rootChildCount = root->hostIndex(static_cast<int>(root->children.size()));
  return rootChildCount + static_cast<int>(std::distance(detachedCarriers_.begin(), carrierIt));
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

std::optional<SharedElementRef> LayoutAnimationsProxy::sharedElementOfCarrier(
    const std::shared_ptr<LightNode> &node) const {
  if (const auto it = retiringSharedTransitions_.find(node->current.tag);
      it != retiringSharedTransitions_.end() && it->second.element.run && it->second.element.run->carrier == node) {
    return SharedElementRef{it->second.sharedTag, it->second.element};
  }
  const auto elementIt = std::ranges::find_if(sharedElements_, [&node](const auto &entry) {
    const auto &run = entry.second.run;
    return run && run->carrier == node;
  });
  react_native_assert(elementIt != sharedElements_.end() && "The node is not a carrier");
  if (elementIt == sharedElements_.end()) {
    return std::nullopt;
  }
  return SharedElementRef{elementIt->first, elementIt->second};
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
      auto &transition = collectedTransition.transition;
      auto &[before, after] = transition.snapshot;
      const auto &transform = transition.transform;
      overrideTransform(before, transform[BEFORE], propsParserContext);
      overrideTransform(after, transform[AFTER], propsParserContext);
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
      auto &run = startSharedTransitionRun(
          before, sharedTag, collectedTransition.nodes, false, transaction, propsParserContext);

      const auto target = targetInCarrierSpace(run, after);
      startSharedTransition(
          run.carrier,
          run.carrierStartView,
          asCarrierView(target, run.carrier, propsParserContext),
          ownCarrierView(target, run.carrier, propsParserContext).props,
          config,
          restartContentFade(run));
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
      if (run.carrier->isNestedCarrier && !keepsNesting(run.carrier, run.target)) {
        moveNestedCarrierToRoot(run, transaction.filteredMutations);
      }
      overrideTransform(after, transition.transform[AFTER], propsParserContext);
      const auto target = targetInCarrierSpace(run, after);
      const auto carrierAfter = asCarrierView(target, run.carrier, propsParserContext);
      if (hasPendingLayoutAnimation(carrierTag)) {
        updateLayoutAnimationTarget(
            carrierTag,
            carrierAfter,
            ownCarrierView(target, run.carrier, propsParserContext).props,
            config,
            restartContentFade(run));
        continue;
      }
      if (targetEndChanged(run, carrierAfter)) {
        startSharedTransition(
            run.carrier,
            carrierAnimation(run).currentView,
            carrierAfter,
            ownCarrierView(target, run.carrier, propsParserContext).props,
            config,
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
// its shared element. A child with a held entering animation also stays at
// opacity 0 until the animation starts.
void LayoutAnimationsProxy::keepTransitioningViewsHidden(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  auto hiddenTags = hiddenViewTags();
  for (const auto &held : heldEnterings_) {
    hiddenTags.insert(held.node->current.tag);
  }
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
    if (!flushStructuralMutations || runContinues(tag) || landsWithOtherRuns(*element.run) ||
        isDescendantOfAny(element.run->target, coveringViews)) {
      preservedTags.insert(tag);
      continue;
    }
    finishSharedTransition(sharedTag, element, transaction, propsParserContext, true);
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

// A carrier that waits for its frames to enter the mount queue does not finish in this pull.
bool LayoutAnimationsProxy::runContinues(const Tag carrierTag) const {
  return !hasCarrierAnimationEnded(carrierTag) || hasUnqueuedCarrierFrame(carrierTag);
}

// Nested carriers land with the carrier that moves them, when the last run of the group ends. A nested carrier
// that React moved out of every moving carrier lands on its own.
bool LayoutAnimationsProxy::landsWithOtherRuns(const SharedTransitionRun &run) const {
  if (run.carrier->isNestedCarrier) {
    return carrierAncestorOf(run.carrier) != nullptr;
  }
  return std::ranges::any_of(sharedElements_, [&](const auto &entry) {
    const auto &nestedRun = entry.second.run;
    return nestedRun && nestedRun->carrier->isNestedCarrier && isCarriedBy(nestedRun->carrier, run.carrier) &&
        runContinues(nestedRun->carrier->current.tag);
  });
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
    SharedElement &element,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext,
    const bool landed) const {
  finishNestedSharedTransitions(element.run->carrier, transaction, propsParserContext, landed);
  auto run = *element.run;
  const bool targetGone = !isLightNodeMapped(run.target) || run.target->isExiting();
  // A gesture-driven run leaves its source to the screen pop.
  transaction.restoreRequests.push_back({sharedTag, run.target, run.gestureDriven ? nullptr : run.source});
  attachCarrier(sharedTag, run, transaction.filteredMutations, propsParserContext);
  if (landed && !targetGone && run.contentFade && run.carrier != run.target) {
    fadeInTargetContent(run, transaction, propsParserContext);
  }
  element.run.reset();
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
  std::vector<SharedTag> nestedTags;
  for (const auto &[sharedTag, element] : sharedElements_) {
    const auto &run = element.run;
    if (run && run->carrier->isNestedCarrier && isCarriedBy(run->carrier, carrier)) {
      nestedTags.push_back(sharedTag);
    }
  }
  for (const auto &sharedTag : nestedTags) {
    if (auto &element = sharedElements_.at(sharedTag); element.run) {
      finishSharedTransition(sharedTag, element, transaction, propsParserContext, landed);
    }
  }
}

// MARK: Content Fade

// The children fade toward the endpoint that the carrier shows: in when the carrier is the target, out otherwise.
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

// Nested carriers and hidden endpoints keep their own opacity, so the children that hold them do not fade.
std::vector<std::shared_ptr<LightNode>> LayoutAnimationsProxy::fadingChildren(
    const std::shared_ptr<LightNode> &node,
    const std::unordered_set<Tag> &hiddenTags) const {
  std::unordered_set<Tag> holdingChildren;
  const auto keepChildHolding = [&](const std::shared_ptr<LightNode> &view) {
    for (auto child = view, parent = view->parent.lock(); parent; child = parent, parent = parent->parent.lock()) {
      if (parent == node) {
        holdingChildren.insert(child->current.tag);
        return;
      }
    }
  };
  for (const auto &[_, element] : sharedElements_) {
    if (element.run && element.run->carrier->isNestedCarrier) {
      keepChildHolding(element.run->carrier);
    }
    for (const auto &hiddenView : element.hiddenViews) {
      keepChildHolding(hiddenView.node);
    }
  }
  std::vector<std::shared_ptr<LightNode>> children;
  for (const auto &child : node->children) {
    if (isLightNodeMapped(child) && !child->isDetached && isViewKind(child->current) &&
        !hiddenTags.contains(child->current.tag) && !holdingChildren.contains(child->current.tag)) {
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
  const auto tag = child->current.tag;
  const bool animated =
      hasPendingLayoutAnimation(tag) || layoutAnimations_.contains(tag) || completedAnimations_.contains(tag);
  if (!animated) {
    resolveLightNodeProps(child);
  }
  const auto synchronousOpacity = !animated && readSynchronousOpacity_ ? readSynchronousOpacity_(tag) : std::nullopt;
  const auto ownOpacity = synchronousOpacity.value_or(getViewProps(animated ? view : child->current).opacity);
  return cloneViewWithOpacity(view, ownOpacity * contentOpacity, propsParserContext);
}

void LayoutAnimationsProxy::composeSynchronousProps(UpdatesBatch &updatesBatch) const {
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto runs = contentFadeRuns();
  if (runs.empty()) {
    return;
  }
  const auto hiddenTags = hiddenViewTags();
  std::unordered_map<Tag, double> factors;
  for (const auto *run : runs) {
    for (const auto &child : fadingChildren(run->carrier, hiddenTags)) {
      factors[child->current.tag] = run->contentFade->mountedOpacity;
    }
  }
  for (auto &[family, props] : updatesBatch) {
    if (family->getSurfaceId() != surfaceId_) {
      continue;
    }
    const auto factor = factors.find(family->getTag());
    if (auto opacity = props.get_ptr("opacity"); factor != factors.end() && opacity && opacity->isNumber()) {
      *opacity = opacity->asDouble() * factor->second;
    }
  }
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
  const auto addRun = [&runs](SharedElement &element) {
    if (element.run && element.run->contentFade) {
      runs.push_back(&*element.run);
    }
  };
  for (auto &[_, element] : sharedElements_) {
    addRun(element);
  }
  for (auto &[_, retiring] : retiringSharedTransitions_) {
    addRun(retiring.element);
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

// A faded child that is not in keptChildren shows its own opacity again.
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

// An entering animation of a fading target child waits until the child stops being fading target content: when
// the run lands, or without a landing, for example on a reversal. It also waits while the run waits for a parent
// shared view. A child that React removes before then stays hidden until it is gone, and its animation does not start.
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

// The target shows its children at opacity 0 when it lands. A child with a held entering animation plays it,
// the other children fade in with the fade-in config. An exiting child with a held entering animation stays hidden.
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
    const auto opacity = getViewProps(view).opacity;
    filteredMutations.push_back(createPropsUpdate(
        cloneViewWithoutOpacity(view, propsParserContext),
        cloneViewWithOpacity(view, opacity, propsParserContext),
        parent->current.tag,
        propsParserContext));
  }

  std::erase_if(sharedElements_, [](const auto &entry) {
    const auto &element = entry.second;
    return !element.run && element.hiddenViews.empty();
  });
}

// MARK: Position Calculation

// A running layout animation keeps the frame that is on screen in its own record.
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
  if (const auto carried =
          endsPathOnScreen(pathNode, node, useViewsOnScreen) ? sharedElementOfCarrier(pathNode) : std::nullopt) {
    return carrierViewOnScreen(*carried->element.run);
  }
  return useViewsOnScreen ? viewOnScreen(pathNode) : pathNode->current;
}

std::vector<react::Point> LayoutAnimationsProxy::getAbsolutePositionsForRootPathView(
    const std::shared_ptr<LightNode> &node,
    const bool useViewsOnScreen) const {
  std::vector<react::Point> viewsAbsolutePositions;
  auto currentNode = node;
  while (currentNode) {
    const bool endsPath = endsPathOnScreen(currentNode, node, useViewsOnScreen);
    react::Point viewPosition;
    const auto &componentName = currentNode->current.componentName;
    react_native_assert(componentName && "Component name is nullptr");
    if (!strcmp(componentName, "ScrollView")) {
      auto state = std::static_pointer_cast<const ConcreteState<ScrollViewState>>(currentNode->current.state);
      auto data = state->getData();
      viewPosition -= data.contentOffset;
    }
    const auto &view = pathView(currentNode, node, useViewsOnScreen);
    const auto parent = currentNode->parent.lock();
    if (parent && !strcmp(componentName, "RNSScreen") && currentNode->children.size() >= 2) {
      const auto &parentView = useViewsOnScreen ? viewOnScreen(parent) : parent->current;
      const float headerHeight = parentView.layoutMetrics.frame.size.height - view.layoutMetrics.frame.size.height;
      viewPosition.y += headerHeight;
    }
    viewPosition += view.layoutMetrics.frame.origin;
    viewsAbsolutePositions.emplace_back(viewPosition);
    currentNode = endsPath ? nullptr : parent;
  }
  for (int i = static_cast<int>(viewsAbsolutePositions.size()) - 2; i >= 0; --i) {
    viewsAbsolutePositions[i] += viewsAbsolutePositions[i + 1];
  }
  return viewsAbsolutePositions;
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
    transforms.push_back({props.transform, origin, viewSize});
    currentNode = endsPath ? nullptr : currentNode->parent.lock();
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
