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
    ShadowView copy;
    std::optional<Transform> newTransform;
    if (useViewsOnScreen && node->isDetached) {
      copy = carrierViewOnScreen(*sharedElementOfCarrier(node).second.run);
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

        const auto &run = startSharedTransitionRun(
            before, sharedTag, collectedTransition.nodes, true, transaction, propsParserContext);

        startProgressTransition(
            run.carrier->current.tag,
            asCarrierView(before, run.carrier, propsParserContext),
            asCarrierView(after, run.carrier, propsParserContext),
            ownCarrierView(after, run.carrier, propsParserContext).props);
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
      const auto &layoutAnimation = layoutAnimationIt->second;
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
    for (auto &[sharedTag, element] : sharedElements_) {
      if (!element.run || !element.run->gestureDriven) {
        continue;
      }
      sources.push_back({sharedTag, element.run->source});
      finishSharedTransition(sharedTag, element, transaction, propsParserContext);
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

// A run that still animates keeps its carrier. A new carrier is the source view, because its
// content is already on screen. A source that React removes in this transaction cannot stay
// mounted, so then the target view is the carrier.
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
    const bool carrierChangedTag = findSharedTag(run->carrier->current) != sharedTag;
    if (!isAnimating || carrierChangedTag) {
      react_native_assert((isAnimating || completedAnimations_.contains(tag)) && "Shared carrier has no animation");
      attachCarrier(sharedTag, *run, transaction.filteredMutations, propsParserContext);
      run.reset();
    }
  }
  if (!run) {
    const auto &[beforeNode, afterNode] = nodes;
    const auto &carrier = beforeNode->isExiting() ? afterNode : beforeNode;
    // A view carries one run. Its shared tag can change while it carries the run of the old tag.
    if (carrier->isDetached) {
      auto &[carriedTag, carriedElement] = sharedElementOfCarrier(carrier);
      finishSharedTransition(carriedTag, carriedElement, transaction, propsParserContext);
    }
    run = SharedTransitionRun{.carrier = carrier};
    // The carrier shows its own props from the start. The animation starts from the props of the
    // source, so its first frame can write again props that the carrier already shows.
    detachCarrier(*run, ownCarrierView(before, carrier, propsParserContext), transaction, propsParserContext);
  }
  run->source = nodes[BEFORE];
  run->target = nodes[AFTER];
  run->gestureDriven = gestureDriven;
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
  if (view.componentHandle != carrier->current.componentHandle) {
    return ownCarrierView(view, carrier, propsParserContext);
  }
  resolveLightNodeProps(carrier);
  auto carrierView = carrier->current;
  carrierView.layoutMetrics = view.layoutMetrics;
  carrierView.props = view.props;
  return carrierView;
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
  overrideTransform(carrierView, getViewProps(view).transform, propsParserContext);
  return carrierView;
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
  ShadowViewMutationList mutations;
  mutations.push_back(
      ShadowViewMutation::RemoveMutation(parent->current.tag, mounted, parent->hostIndex(parent->positionOf(node))));
  node->setDetached(true);
  detachedCarriers_.push_back(node);
  // The run owns the frames of its carrier, so an animation that this transaction queued for
  // the same view does not start.
  const auto isCarrier = [&node](const PendingNodeAnimation &animation) {
    return animation.node == node;
  };
  std::erase_if(transaction.layout, isCarrier);
  std::erase_if(transaction.entering, isCarrier);

  forgetHiddenView(tag);
  // Android writes only the raw props of an Update, so the opacity must be in them to show
  // a carrier that was hidden.
  run.carrierStartView = cloneViewWithOpacity(startView, getViewProps(startView).opacity, propsParserContext);
#ifdef ANDROID
  run.carrierStartView = resetPropsMissingFrom(run.carrierStartView, mounted, propsParserContext);
#endif
  mutations.push_back(ShadowViewMutation::InsertMutation(surfaceId_, run.carrierStartView, carrierHostIndex(node)));
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

// The carrier returns to its parent hidden. The restore in cleanupSharedTransitions shows it
// when it is the target of the run.
void LayoutAnimationsProxy::attachCarrier(
    const SharedTag &sharedTag,
    const SharedTransitionRun &run,
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext) const {
  const auto node = run.carrier;
  const auto tag = node->current.tag;
  const auto mounted = carrierViewOnScreen(run);
  const auto parent = node->parent.lock();
  react_native_assert(parent && "Parent node is nullptr");
  mutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId_, mounted, carrierHostIndex(node)));
  std::erase(detachedCarriers_, node);
  node->setDetached(false);
  cancelLayoutAnimation(tag);

  resolveLightNodeProps(node);
  auto homeView = cloneViewWithoutOpacity(node->current, propsParserContext);
#ifdef ANDROID
  homeView = resetPropsMissingFrom(homeView, mounted, propsParserContext);
#endif
  const auto parentTag = parent->current.tag;
  mutations.push_back(
      ShadowViewMutation::InsertMutation(parentTag, homeView, parent->hostIndex(parent->positionOf(node))));
  mutations.push_back(ShadowViewMutation::UpdateMutation(mounted, homeView, parentTag));
  hideInSharedElement(sharedTag, node);
}

// React moves and deletes views at the place where it rendered them, so a carrier that React
// moves or deletes, alone or with an ancestor, returns to that place first.
void LayoutAnimationsProxy::attachCarriersThatReactMoves(
    const std::unordered_set<Tag> &deleted,
    const std::unordered_set<Tag> &moved,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  if (detachedCarriers_.empty()) {
    return;
  }
  for (auto &[sharedTag, element] : sharedElements_) {
    if (!element.run) {
      continue;
    }
    const auto &carrier = element.run->carrier;
    bool isDeleted = false;
    for (auto ancestor = carrier; ancestor && !isDeleted; ancestor = ancestor->parent.lock()) {
      isDeleted = deleted.contains(ancestor->current.tag);
    }
    if (isDeleted || moved.contains(carrier->current.tag)) {
      finishSharedTransition(sharedTag, element, transaction, propsParserContext);
    }
  }
}

int LayoutAnimationsProxy::carrierHostIndex(const std::shared_ptr<LightNode> &node) const {
  const auto root = lightNodes_.at(surfaceId_);
  const auto carrierIt = std::ranges::find(detachedCarriers_, node);
  react_native_assert(carrierIt != detachedCarriers_.end() && "The node is not a detached carrier");
  const auto rootChildCount = root->hostIndex(static_cast<int>(root->children.size()));
  return rootChildCount + static_cast<int>(std::distance(detachedCarriers_.begin(), carrierIt));
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

std::pair<const SharedTag, SharedElement> &LayoutAnimationsProxy::sharedElementOfCarrier(
    const std::shared_ptr<LightNode> &node) const {
  const auto elementIt = std::ranges::find_if(sharedElements_, [&node](const auto &entry) {
    const auto &run = entry.second.run;
    return run && run->carrier == node;
  });
  react_native_assert(elementIt != sharedElements_.end() && "The node is not a carrier");
  return *elementIt;
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
      const auto &run = startSharedTransitionRun(
          before, sharedTag, collectedTransition.nodes, false, transaction, propsParserContext);

      startSharedTransition(
          run.carrier->current.tag,
          asCarrierView(before, run.carrier, propsParserContext),
          asCarrierView(after, run.carrier, propsParserContext),
          ownCarrierView(after, run.carrier, propsParserContext).props,
          config);
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
      const auto carrierTag = run.carrier->current.tag;
      if (!hasPendingLayoutAnimation(carrierTag) && !layoutAnimations_.contains(carrierTag)) {
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
      overrideTransform(after, transition.transform[AFTER], propsParserContext);
      const auto carrierAfter = asCarrierView(after, run.carrier, propsParserContext);
      if (hasPendingLayoutAnimation(carrierTag)) {
        updateLayoutAnimationTarget(
            carrierTag, carrierAfter, ownCarrierView(after, run.carrier, propsParserContext).props, config);
        continue;
      }
      const auto &layoutAnimation = layoutAnimations_.at(carrierTag);
      if (layoutAnimation.finalView.layoutMetrics != carrierAfter.layoutMetrics) {
        startSharedTransition(
            carrierTag,
            layoutAnimation.currentView,
            carrierAfter,
            ownCarrierView(after, run.carrier, propsParserContext).props,
            config);
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

void LayoutAnimationsProxy::finishSharedTransition(
    const SharedTag &sharedTag,
    SharedElement &element,
    TransactionMeta &transaction,
    const PropsParserContext &propsParserContext) const {
  transaction.restoreRequests.push_back({sharedTag, element.run->target});
  attachCarrier(sharedTag, *element.run, transaction.filteredMutations, propsParserContext);
  element.run.reset();
}

bool LayoutAnimationsProxy::isSharedCarrier(const Tag tag) const {
  return std::ranges::any_of(sharedElements_, [tag](const auto &entry) {
    const auto &run = entry.second.run;
    return run && run->carrier->current.tag == tag;
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
    const auto opacity = getViewProps(view).opacity;
    filteredMutations.push_back(ShadowViewMutation::UpdateMutation(
        cloneViewWithoutOpacity(view, propsParserContext),
        cloneViewWithOpacity(view, opacity, propsParserContext),
        parent->current.tag));
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
  if (endsPathOnScreen(pathNode, node, useViewsOnScreen)) {
    return carrierViewOnScreen(*sharedElementOfCarrier(pathNode).second.run);
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
