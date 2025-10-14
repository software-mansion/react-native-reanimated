#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/LayoutAnimations/PropsDiffer.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>
#ifndef ANDROID
#include <react/renderer/components/rnscreens/Props.h>
#endif
#include <glog/logging.h>
#include <react/renderer/animations/utils.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <react/renderer/core/ConcreteState.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#ifdef ANDROID
#undef LOG
#define LOG SYSLOG
#endif

#include <algorithm>
#include <ranges>
#include <set>
#include <utility>

using ScrollState = ConcreteState<ScrollViewState>;

namespace reanimated {

// MARK: MountingOverrideDelegate

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  ReanimatedSystraceSection d("pullTransaction");
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  ShadowViewMutationList filteredMutations;
  std::vector<std::shared_ptr<MutationNode>> roots;
  bool isInTransition = transitionState_;

  if (isInTransition) {
    updateLightTree(propsParserContext, mutations, filteredMutations);
    handleProgressTransition(
        filteredMutations, mutations, propsParserContext, surfaceId);
  } else if (!synchronized_) {
    auto actualTop = topScreen[surfaceId];
    updateLightTree(propsParserContext, mutations, filteredMutations);
    auto reactTop = findTopScreen(lightNodes_[surfaceId]);
    if (reactTop == actualTop) {
      synchronized_ = true;
    }
  } else {
    auto root = lightNodes_[surfaceId];
    auto beforeTopScreen = topScreen[surfaceId];
    if (beforeTopScreen) {
      findSharedElementsOnScreen(beforeTopScreen, 0, propsParserContext);
    }

    updateLightTree(propsParserContext, mutations, filteredMutations);

    root = lightNodes_[surfaceId];
    auto afterTopScreen = findTopScreen(root);
    topScreen[surfaceId] = afterTopScreen;
    if (afterTopScreen) {
      findSharedElementsOnScreen(afterTopScreen, 1, propsParserContext);
    }
    bool shouldTransitionStart =
        beforeTopScreen && afterTopScreen && beforeTopScreen != afterTopScreen;

    if (shouldTransitionStart) {
      std::vector<ShadowViewMutation> temp;
      hideTransitioningViews(0, temp, propsParserContext);
      temp.insert(
          temp.end(), filteredMutations.begin(), filteredMutations.end());
      hideTransitioningViews(1, temp, propsParserContext);
      std::swap(filteredMutations, temp);
    }

    handleSharedTransitionsStart(
        afterTopScreen,
        beforeTopScreen,
        filteredMutations,
        mutations,
        propsParserContext,
        surfaceId);

    for (auto &node : entering_) {
      startEnteringAnimation(node);
    }
    for (auto &node : layout_) {
      startLayoutAnimation(node);
    }
    entering_.clear();
    layout_.clear();

    handleRemovals(filteredMutations, exiting_);
    exiting_.clear();
  }

  cleanupSharedTransitions(filteredMutations, propsParserContext, surfaceId);

  addOngoingAnimations(surfaceId, filteredMutations);

  for (const auto tag : finishedAnimationTags_) {
    auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
    layoutAnimations_.erase(tag);
    updateMap.erase(tag);
  }
  finishedAnimationTags_.clear();

  transitionMap_.clear();
  transitions_.clear();

  return MountingTransaction{
      surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  return true;
}

// MARK: Light Tree

void LayoutAnimationsProxy::updateLightTree(
    const PropsParserContext &propsParserContext,
    const ShadowViewMutationList &mutations,
    ShadowViewMutationList &filteredMutations) const {
  ReanimatedSystraceSection s("updateLightTree");
  std::unordered_set<Tag> moved, deleted;
  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    const auto &mutation = *it;
    switch (mutation.type) {
      case ShadowViewMutation::Delete: {
        deleted.insert(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Insert: {
        moved.insert(mutation.newChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Remove: {
        const auto tag = mutation.oldChildShadowView.tag;
        if (deleted.contains(tag)) {
          lightNodes_[tag]->intent = TO_DELETE;
        } else if (moved.contains(tag)) {
          lightNodes_[tag]->intent = TO_MOVE;
        }
        break;
      }
      default: {
      }
    }
  }

  for (auto &mutation : mutations) {
    maybeUpdateWindowDimensions(mutation);
    switch (mutation.type) {
      case ShadowViewMutation::Update: {
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        if (!node) {
          node = std::make_shared<LightNode>();
        }
        node->previous = mutation.oldChildShadowView;
#ifdef ANDROID
        if (node->current.props) {
          // on android rawProps are used to store the diffed props
          // so we need to merge them
          // this should soon be replaced in RN with Props 2.0 (the diffing will
          // be done at the end of the pipeline)
          auto &currentRawProps = node->current.props->rawProps;
          auto mergedRawProps = folly::dynamic::merge(
              currentRawProps, mutation.newChildShadowView.props->rawProps);
          node->current = mutation.newChildShadowView;
          node->current.props =
              getComponentDescriptorForShadowView(node->current)
                  .cloneProps(
                      propsParserContext,
                      mutation.newChildShadowView.props,
                      RawProps(mergedRawProps));
        } else {
          node->current = mutation.newChildShadowView;
        }
#else
        node->current = mutation.newChildShadowView;
#endif
        auto tag = mutation.newChildShadowView.tag;
        if (layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)) {
          layout_.push_back(node);
        } else {
          filteredMutations.push_back(mutation);
        }
        break;
      }
      case ShadowViewMutation::Create: {
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        node = std::make_shared<LightNode>();
        node->current = mutation.newChildShadowView;
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Delete: {
        //            lightNodes_.erase(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Insert: {
        transferConfigFromNativeID(
            mutation.newChildShadowView.props->nativeId,
            mutation.newChildShadowView.tag);
        auto &node = lightNodes_[mutation.newChildShadowView.tag];
        auto &parent = lightNodes_[mutation.parentTag];
        parent->children.insert(
            parent->children.begin() + mutation.index, node);
        node->parent = parent;
        const auto tag = mutation.newChildShadowView.tag;
        if (node->intent == TO_MOVE &&
            layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)) {
          // TODO: figure out if that's true
          // we are not starting the animation here because any update will come
          // from the UPDATE mutation
          //          layout_.push_back(node);
          filteredMutations.push_back(mutation);
          //          node->previous = node->current;
          //          node->current = mutation.newChildShadowView;
        } else if (layoutAnimationsManager_->hasLayoutAnimation(
                       tag, ENTERING)) {
          entering_.push_back(node);
          filteredMutations.push_back(mutation);
        } else {
          filteredMutations.push_back(mutation);
        }
        break;
      }
      case ShadowViewMutation::Remove: {
        auto &node = lightNodes_[mutation.oldChildShadowView.tag];
        auto &parent = lightNodes_[mutation.parentTag];

        if (node->intent == TO_DELETE && parent->intent != TO_DELETE) {
          exiting_.push_back(node);
          if (parent->children[mutation.index]->current.tag ==
              mutation.oldChildShadowView.tag) {
            filteredMutations.push_back(mutation);
          } else {
            throw std::runtime_error("cos jest nie tak z indexami");
          }
          parent->children.erase(parent->children.begin() + mutation.index);
        } else if (node->intent != TO_DELETE) {
          if (parent->children[mutation.index]->current.tag ==
              mutation.oldChildShadowView.tag) {
            filteredMutations.push_back(mutation);
          } else {
            throw std::runtime_error("cos jest nie tak z indexami");
          }
          parent->children.erase(parent->children.begin() + mutation.index);
        }
        break;
      }
      default:
        break;
    }
  }
}

// MARK: Shared Element Transitions

LightNode::Unshared LayoutAnimationsProxy::findTopScreen(
    LightNode::Unshared node) const {
  LightNode::Unshared result = nullptr;
  if (!node->current.componentName) {
    return result;
  }
  if (isRNSScreen(node)) {
    bool isActive = false;
#ifdef ANDROID
    // TODO: this looks like a RNSScreens bug - sometimes there is no active
    // screen at a deeper level, when going back
    //      float f = node->current.props->rawProps.getDefault("activityState",
    //      0).asDouble(); isActive = f == 2.0f;
    isActive = true;
#else
    isActive =
        std::static_pointer_cast<const RNSScreenProps>(node->current.props)
            ->activityState == 2.0f;
#endif
    if (isActive) {
      result = node;
    }
  }
  for (auto child : std::views::reverse(node->children)) {
    auto top = findTopScreen(child);
    if (top) {
      return top;
    }
  }

  return result;
}

void LayoutAnimationsProxy::findSharedElementsOnScreen(
    const LightNode::Unshared &node,
    int index,
    const PropsParserContext &propsParserContext) const {
  if (sharedTransitionManager_->tagToName_.contains(node->current.tag)) {
    ShadowView copy = node->current;
    std::vector<react::Point> absolutePositions;
    absolutePositions = getAbsolutePositionsForRootPathView(node);
    copy.layoutMetrics.frame.origin = absolutePositions[0];

    auto sharedTag = sharedTransitionManager_->tagToName_[node->current.tag];
    auto &transition = transitionMap_[sharedTag];
    auto transform = parseParentTransforms(node, absolutePositions);
    transition.transform[index] = std::move(transform);
    transition.snapshot[index] = copy;
    transition.parentTag[index] = node->parent.lock()->current.tag;

    if (transition.parentTag[0] && transition.parentTag[1]) {
      // TODO: performance - this is costly on android
      overrideTransform(transition.snapshot[0], transition.transform[0], propsParserContext);
      overrideTransform(transition.snapshot[1], transition.transform[1], propsParserContext);
      transitions_.emplace_back(sharedTag, transition);
    } else if (transition.parentTag[1]) {
      // TODO: this is too eager
      tagsToRestore_.push_back(transition.snapshot[1].tag);
    }
  }
  for (auto &child : node->children) {
    findSharedElementsOnScreen(child, index, propsParserContext);
  }
}

void LayoutAnimationsProxy::handleProgressTransition(
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
    if (beforeTopScreen && afterTopScreen &&
        beforeTopScreen != afterTopScreen) {
      findSharedElementsOnScreen(beforeTopScreen, 0, propsParserContext);
      findSharedElementsOnScreen(afterTopScreen, 1, propsParserContext);
      hideTransitioningViews(0, filteredMutations, propsParserContext);
      hideTransitioningViews(1, filteredMutations, propsParserContext);

      for (auto &[sharedTag, transition] : transitions_) {
        auto &[before, after] = transition.snapshot;
        auto containerTag = getOrCreateContainer(
            before, sharedTag, filteredMutations, surfaceId);
        transferConfigToContainer(containerTag, before.tag);

        restoreMap_[containerTag][0] = before.tag;
        restoreMap_[containerTag][1] = after.tag;
        before.tag = containerTag;
        after.tag = containerTag;
        activeTransitions_.insert(containerTag);

        startProgressTransition(containerTag, before, after, surfaceId);
      }
    }
  } else if (transitionState_ == ACTIVE) {
    for (auto tag : activeTransitions_) {
      auto layoutAnimation = layoutAnimations_[tag];
      auto &updateMap =
          surfaceManager.getUpdateMap(layoutAnimation.finalView.surfaceId);
      auto before = layoutAnimation.startView.layoutMetrics.frame;
      auto after = layoutAnimation.finalView.layoutMetrics.frame;
      auto x = before.origin.x +
          transitionProgress_ * (after.origin.x - before.origin.x);
      auto y = before.origin.y +
          transitionProgress_ * (after.origin.y - before.origin.y);
      auto width = before.size.width +
          transitionProgress_ * (after.size.width - before.size.width);
      auto height = before.size.height +
          transitionProgress_ * (after.size.height - before.size.height);

      auto beforeProps = std::static_pointer_cast<const BaseViewProps>(
          layoutAnimation.startView.props);
      auto afterProps = std::static_pointer_cast<const BaseViewProps>(
          layoutAnimation.finalView.props);
      auto beforeRadius =
          beforeProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point))
              .value;
      auto afterRadius =
          afterProps->borderRadii.all.value_or(ValueUnit(0, UnitType::Point))
              .value;

      auto d = folly::dynamic::object(
          "borderRadius",
          beforeRadius + transitionProgress_ * (afterRadius - beforeRadius));

#ifdef RN_SERIALIZABLE_STATE
      //        auto rawProps = RawProps(folly::dynamic::merge(
      //            layoutAnimation.finalView->props->rawProps, d));
      Props::Shared newProps = nullptr;
#else
      auto rawProps = RawProps(std::move(d));

      auto newProps =
          getComponentDescriptorForShadowView(layoutAnimation.finalView)
              .cloneProps(
                  propsParserContext,
                  layoutAnimation.finalView.props,
                  std::move(rawProps));
#endif

      updateMap.insert_or_assign(
          tag, UpdateValues{newProps, {x, y, width, height}});
    }
  }

  if (transitionState_ == START) {
    transitionState_ = ACTIVE;
  } else if (transitionState_ == END || transitionState_ == CANCELLED) {
    for (auto tag : activeTransitions_) {
      sharedContainersToRemove_.push_back(tag);
      tagsToRestore_.push_back(restoreMap_[tag][1]);
      if (transitionState_ == CANCELLED) {
        tagsToRestore_.push_back(restoreMap_[tag][0]);
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

void LayoutAnimationsProxy::overrideTransform(
    ShadowView &shadowView,
    const std::optional<Transform> &transform,
    const PropsParserContext &propsParserContext) const {
    if (!transform) {
        return;
    }
#ifdef ANDROID
  auto array = folly::dynamic::array(
      folly::dynamic::object("matrix", transform->operator folly::dynamic()));
  folly::dynamic newTransformDynamic =
      folly::dynamic::object("transform", array);
  auto newRawProps =
      folly::dynamic::merge(shadowView.props->rawProps, newTransformDynamic);
  auto newProps =
      getComponentDescriptorForShadowView(shadowView)
          .cloneProps(
              propsParserContext, shadowView.props, RawProps(newRawProps));
  auto viewProps = std::const_pointer_cast<ViewProps>(
      std::static_pointer_cast<const ViewProps>(newProps));
#else
  auto newProps = getComponentDescriptorForShadowView(shadowView)
                      .cloneProps(propsParserContext, shadowView.props, {});
  auto viewProps = std::const_pointer_cast<ViewProps>(
      std::static_pointer_cast<const ViewProps>(newProps));
  viewProps->transform = *transform;
#endif
  shadowView.props = newProps;
}

void LayoutAnimationsProxy::transferConfigToContainer(
    Tag containerTag,
    Tag beforeTag) const {
  layoutAnimationsManager_->getConfigsForType(
      LayoutAnimationType::SHARED_ELEMENT_TRANSITION)[containerTag] =
      layoutAnimationsManager_->getConfigsForType(
          LayoutAnimationType::SHARED_ELEMENT_TRANSITION)[beforeTag];
}

Tag LayoutAnimationsProxy::getOrCreateContainer(
    const ShadowView &before,
    SharedTag sharedTag,
    ShadowViewMutationList &filteredMutations,
    SurfaceId surfaceId) const {
  auto containerTag = sharedTransitionManager_->containerTags_[sharedTag];
  auto shouldCreateContainer =
      (containerTag == -1 || !layoutAnimations_.contains(containerTag));

  if (shouldCreateContainer) {
    auto &root = lightNodes_[surfaceId];
    ShadowView container = before;
    containerTag = myTag;
    sharedTransitionManager_->tagToName_[containerTag] = sharedTag;

    container.tag = containerTag;
    filteredMutations.push_back(ShadowViewMutation::CreateMutation(container));
    filteredMutations.push_back(ShadowViewMutation::InsertMutation(
        surfaceId, container, (int)root->children.size()));
    auto node = std::make_shared<LightNode>();
    node->current = std::move(container);
    root->children.push_back(node);
    lightNodes_[myTag] = std::move(node);

    sharedTransitionManager_->containerTags_[sharedTag] = containerTag;
    myTag += 2;
  }
  return containerTag;
}

void LayoutAnimationsProxy::handleSharedTransitionsStart(
    const LightNode::Unshared &afterTopScreen,
    const LightNode::Unshared &beforeTopScreen,
    ShadowViewMutationList &filteredMutations,
    const ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  ReanimatedSystraceSection s1(
      "LayoutAnimationsProxy::handleSharedTransitionsStart");

  if (!beforeTopScreen || !afterTopScreen) {
    return;
  }

  if (beforeTopScreen != afterTopScreen) {
    for (auto &[sharedTag, transition] : transitions_) {
      auto &[before, after] = transition.snapshot;
      auto containerTag =
          getOrCreateContainer(before, sharedTag, filteredMutations, surfaceId);

      transferConfigToContainer(containerTag, before.tag);
      restoreMap_[containerTag][1] = after.tag;
      before.tag = containerTag;
      after.tag = containerTag;

      startSharedTransition(containerTag, before, after, surfaceId);
    }
  } else if (!mutations.empty()) {
    for (auto &[sharedTag, transition] : transitions_) {
      auto &[_, after] = transition.snapshot;

      auto containerTag =
          sharedTransitionManager_->containerTags_[sharedTag];
      if (!layoutAnimations_.contains(containerTag)) {
        continue;
      }
      after.tag = containerTag;
      auto &la = layoutAnimations_[containerTag];
      if (la.finalView.layoutMetrics != after.layoutMetrics) {
        startSharedTransition(containerTag, la.currentView, after, surfaceId);
      }
    }
  }
}

void LayoutAnimationsProxy::cleanupSharedTransitions(
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext,
    SurfaceId surfaceId) const {
  for (auto &tag : tagsToRestore_) {
    auto &node = lightNodes_[tag];
    if (node) {
      auto view = node->current;
      auto parentTag = node->parent.lock()->current.tag;
      auto m = ShadowViewMutation::UpdateMutation(
          cloneViewWithoutOpacity(view, propsParserContext),
          cloneViewWithOpacity(view, propsParserContext),
          parentTag);
      filteredMutations.push_back(m);
    }
  }
  tagsToRestore_.clear();

  for (auto &tag : sharedContainersToRemove_) {
    auto root = lightNodes_[surfaceId];
    for (int i = 0; i < root->children.size(); i++) {
      auto &child = root->children[i];
      if (child->current.tag == tag) {
        filteredMutations.push_back(
            ShadowViewMutation::RemoveMutation(surfaceId, child->current, i));
        filteredMutations.push_back(
            ShadowViewMutation::DeleteMutation(child->current));
        root->children.erase(root->children.begin() + i);
      }
    }
  }
  sharedContainersToRemove_.clear();
}

void LayoutAnimationsProxy::hideTransitioningViews(
    int index,
    ShadowViewMutationList &filteredMutations,
    const PropsParserContext &propsParserContext) const {
  for (auto &[sharedTag, transition] : transitions_) {
    const auto &shadowView = transition.snapshot[index];
    const auto &parentTag = transition.parentTag[index];
    auto m = ShadowViewMutation::UpdateMutation(
        shadowView,
        cloneViewWithoutOpacity(shadowView, propsParserContext),
        parentTag);
    filteredMutations.push_back(m);
  }
}

std::optional<SurfaceId> LayoutAnimationsProxy::onTransitionProgress(
    int tag,
    double progress,
    bool isClosing,
    bool isGoingForward,
    bool isSwiping) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  transitionUpdated_ = true;
  bool isAndroid;
#ifdef ANDROID
  isAndroid = true;
#else
  isAndroid = false;
#endif
  // TODO: this new approach causes all back transitions to be progress
  // transitions
  if (!isClosing && !isGoingForward && !isAndroid) {
    transitionProgress_ = progress;
    if (transitionState_ == NONE && progress < 1) {
      transitionState_ = START;
      transitionTag_ = tag;
    }
    //    else if (transitionState_ == ACTIVE && progress < eps){
    //      transitionState_ = CANCELLED;
    //    }
    else if (transitionState_ == ACTIVE && progress == 1) {
      transitionState_ = END;
    }
    // TODO: unfix
    return 1;
  }
  return {};
}

std::optional<SurfaceId> LayoutAnimationsProxy::onGestureCancel() {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (transitionState_) {
    transitionState_ = CANCELLED;
    transitionUpdated_ = true;
    // TODO: unfix
    return 1;
  }
  return {};
}

// MARK: Layout Animation Updates

std::optional<SurfaceId> LayoutAnimationsProxy::progressLayoutAnimation(
    int tag,
    const jsi::Object &newStyle) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;

  maybeRestoreOpacity(layoutAnimation, newStyle);

  auto rawProps =
      std::make_shared<RawProps>(uiRuntime_, jsi::Value(uiRuntime_, newStyle));

  PropsParserContext propsParserContext{
      layoutAnimation.finalView.surfaceId, *contextContainer_};
#ifdef RN_SERIALIZABLE_STATE
  rawProps = std::make_shared<RawProps>(folly::dynamic::merge(
      layoutAnimation.finalView.props->rawProps, (folly::dynamic)*rawProps));
#endif
  auto newProps = getComponentDescriptorForShadowView(layoutAnimation.finalView)
                      .cloneProps(
                          propsParserContext,
                          layoutAnimation.finalView.props,
                          std::move(*rawProps));
  auto &updateMap =
      surfaceManager.getUpdateMap(layoutAnimation.finalView.surfaceId);
  updateMap.insert_or_assign(
      tag, UpdateValues{newProps, Frame(uiRuntime_, newStyle)});

  return layoutAnimation.finalView.surfaceId;
}

std::optional<SurfaceId> LayoutAnimationsProxy::endLayoutAnimation(
    int tag,
    bool shouldRemove) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;

  // multiple layout animations can be triggered for a view
  // one after the other, so we need to keep count of how many
  // were actually triggered, so that we don't cleanup necessary
  // structures too early
  if (layoutAnimation.count > 1) {
    layoutAnimation.count--;
    return {};
  }
  finishedAnimationTags_.push_back(tag);
  auto surfaceId = layoutAnimation.finalView.surfaceId;
  auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
  layoutAnimations_.erase(tag);
  updateMap.erase(tag);

  if (sharedTransitionManager_->tagToName_.contains(tag)) {
    auto sharedTag = sharedTransitionManager_->tagToName_[tag];
    sharedTransitionManager_->containerTags_.erase(sharedTag);

    sharedContainersToRemove_.push_back(tag);
    tagsToRestore_.push_back(restoreMap_[tag][1]);
    transformForNode_.clear();
  }
  if (!shouldRemove || !lightNodes_.contains(tag)) {
    return surfaceId;
  }

  auto node = lightNodes_[tag];
  node->state = DEAD;
  deadNodes.insert(node);

  return surfaceId;
}

void LayoutAnimationsProxy::handleRemovals(
    ShadowViewMutationList &filteredMutations,
    std::vector<std::shared_ptr<LightNode>> &roots) const {
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = roots.rbegin(); it != roots.rend(); it++) {
    auto &node = *it;

    if (startAnimationsRecursively(
            node, true, true, false, filteredMutations)) {
      auto parent = node->parent.lock();
      // TODO: handle this better
      auto current = node->current;
      if (layoutAnimations_.contains(node->current.tag)) {
        current = layoutAnimations_.at(node->current.tag).currentView;
      }
      filteredMutations.push_back(ShadowViewMutation::InsertMutation(
          parent->current.tag, current, (int)parent->children.size()));
      parent->children.push_back(node);
      parent->animatedChildrenCount++;
      if (node->state == UNDEFINED) {
        node->state = WAITING;
      }
    } else {
      maybeCancelAnimation(node->current.tag);
      filteredMutations.push_back(
          ShadowViewMutation::DeleteMutation(node->current));
    }
  }

  for (auto node : deadNodes) {
    if (node->state != DELETED) {
      auto parent = node->parent.lock();
      int index = 0;
      for (auto it = parent->children.begin(); it != parent->children.end();
           it++, index++) {
        auto n = *it;
        if (n->current.tag == node->current.tag) {
          parent->animatedChildrenCount--;
          break;
        }
      }

      endAnimationsRecursively(node, index, filteredMutations);
      maybeDropAncestors(node->parent.lock(), node, filteredMutations);
    }
  }
  deadNodes.clear();
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

    auto newView = layoutAnimation.finalView;
    if (updateValues.newProps) {
      newView.props = updateValues.newProps;
    }
    updateLayoutMetrics(newView.layoutMetrics, updateValues.frame);

    mutations.push_back(ShadowViewMutation::UpdateMutation(
        layoutAnimation.currentView, newView, layoutAnimation.parentTag));
    layoutAnimation.currentView = newView;
  }
  updateMap.clear();
}

void LayoutAnimationsProxy::endAnimationsRecursively(
    std::shared_ptr<LightNode> node,
    int index,
    ShadowViewMutationList &mutations) const {
  maybeCancelAnimation(node->current.tag);
  node->state = DELETED;
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list

  auto i = (int)node->children.size() - 1;
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++) {
    auto &subNode = *it;
    if (subNode->state != DELETED) {
      endAnimationsRecursively(subNode, i--, mutations);
    }
  }
  node->children.clear();
  mutations.push_back(ShadowViewMutation::RemoveMutation(
      node->parent.lock()->current.tag, node->current, index));
  mutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
}

void LayoutAnimationsProxy::maybeDropAncestors(
    std::shared_ptr<LightNode> parent,
    std::shared_ptr<LightNode> child,
    ShadowViewMutationList &cleanupMutations) const {
  for (auto it = parent->children.begin(); it != parent->children.end(); it++) {
    if ((*it)->current.tag == child->current.tag) {
      parent->children.erase(it);
      break;
    }
  }
  if (parent->state == UNDEFINED) {
    return;
  }

  if (parent->children.size() == 0 && parent->state != ANIMATING) {
    auto pp = parent->parent.lock();
    for (int i = 0; i < pp->children.size(); i++) {
      if (pp->children[i]->current.tag == parent->current.tag) {
        cleanupMutations.push_back(ShadowViewMutation::RemoveMutation(
            pp->current.tag, parent->current, i));
        maybeCancelAnimation(parent->current.tag);
        cleanupMutations.push_back(
            ShadowViewMutation::DeleteMutation(parent->current));
        maybeDropAncestors(parent->parent.lock(), parent, cleanupMutations);
        break;
      }
    }
  }
}

const ComponentDescriptor &
LayoutAnimationsProxy::getComponentDescriptorForShadowView(
    const ShadowView &shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
}

bool LayoutAnimationsProxy::startAnimationsRecursively(
    std::shared_ptr<LightNode> node,
    bool shouldRemoveSubviewsWithoutAnimations,
    bool shouldAnimate,
    bool isScreenPop,
    ShadowViewMutationList &mutations) const {
  if (isRNSScreenOrStack(node)) {
    isScreenPop = true;
  }

  shouldAnimate = !isScreenPop &&
      layoutAnimationsManager_->shouldAnimateExiting(
          node->current.tag, shouldAnimate);

  bool hasExitAnimation = shouldAnimate &&
      layoutAnimationsManager_->hasLayoutAnimation(
          node->current.tag, LayoutAnimationType::EXITING);
  bool hasAnimatedChildren = false;

  shouldRemoveSubviewsWithoutAnimations =
      shouldRemoveSubviewsWithoutAnimations && !hasExitAnimation;
  std::vector<std::shared_ptr<LightNode>> toBeRemoved;

  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  auto index = (int)node->children.size();
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++) {
    index--;
    auto &subNode = *it;
    if (subNode->state != UNDEFINED) {
      if (shouldAnimate && subNode->state != DEAD) {
        hasAnimatedChildren = true;
      } else {
        endAnimationsRecursively(subNode, index, mutations);
        toBeRemoved.push_back(subNode);
      }
    } else if (startAnimationsRecursively(
                   subNode,
                   shouldRemoveSubviewsWithoutAnimations,
                   shouldAnimate,
                   isScreenPop,
                   mutations)) {
      hasAnimatedChildren = true;
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      maybeCancelAnimation(subNode->current.tag);
      mutations.push_back(ShadowViewMutation::RemoveMutation(
          node->current.tag, subNode->current, index));
      toBeRemoved.push_back(subNode);
      subNode->state = DELETED;
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->current));
    } else {
      subNode->state = WAITING;
    }
  }

  for (auto &subNode : toBeRemoved) {
    node->removeChild(subNode);
  }

  bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->state = ANIMATING;
    startExitingAnimation(node);
  } else {
    //    layoutAnimationsManager_->clearLayoutAnimationConfig(node->tag);
  }

  return wantAnimateExit;
}

void LayoutAnimationsProxy::updateOngoingAnimationTarget(
    const int tag,
    const ShadowViewMutation &mutation) const {
  layoutAnimations_[tag].finalView = mutation.newChildShadowView;
}

void LayoutAnimationsProxy::maybeCancelAnimation(const int tag) const {
  if (!layoutAnimations_.contains(tag)) {
    return;
  }
  layoutAnimations_.erase(tag);
  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(), tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto &uiRuntime = strongThis->uiRuntime_;
    strongThis->layoutAnimationsManager_->cancelLayoutAnimation(uiRuntime, tag);
  });
}

void LayoutAnimationsProxy::transferConfigFromNativeID(
    const std::string nativeIdString,
    const int tag) const {
  if (nativeIdString.empty()) {
    return;
  }
  try {
    auto nativeId = stoi(nativeIdString);
    layoutAnimationsManager_->transferConfigFromNativeID(nativeId, tag);
  } catch (std::invalid_argument) {
  } catch (std::out_of_range) {
  }
}

// When entering animations start, we temporarily set opacity to 0
// so that we can immediately insert the view at the right position
// and schedule the animation on the UI thread
ShadowView LayoutAnimationsProxy::cloneViewWithoutOpacity(
    const ShadowView &shadowView,
    const PropsParserContext &propsParserContext) const {
  auto newView = shadowView;
  folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps = getComponentDescriptorForShadowView(newView).cloneProps(
      propsParserContext, newView.props, RawProps(opacity));
  newView.props = newProps;
  return newView;
}

ShadowView LayoutAnimationsProxy::cloneViewWithOpacity(
    const ShadowView &shadowView,
    const PropsParserContext &propsParserContext) const {
  auto newView = shadowView;
  const auto &props = static_cast<const ViewProps &>(*newView.props);
  folly::dynamic opacity = folly::dynamic::object("opacity", props.opacity);
  auto newProps = getComponentDescriptorForShadowView(newView).cloneProps(
      propsParserContext, newView.props, RawProps(opacity));
  newView.props = newProps;
  return newView;
}

void LayoutAnimationsProxy::maybeRestoreOpacity(
    LayoutAnimation &layoutAnimation,
    const jsi::Object &newStyle) const {
  if (layoutAnimation.opacity && !newStyle.hasProperty(uiRuntime_, "opacity")) {
    newStyle.setProperty(
        uiRuntime_, "opacity", jsi::Value(*layoutAnimation.opacity));
    layoutAnimation.opacity.reset();
  }
}

void LayoutAnimationsProxy::maybeUpdateWindowDimensions(
    const facebook::react::ShadowViewMutation &mutation) const {
  if (mutation.type == ShadowViewMutation::Update &&
      !std::strcmp(
          mutation.oldChildShadowView.componentName, RootComponentName)) {
    surfaceManager.updateWindow(
        mutation.newChildShadowView.tag,
        mutation.newChildShadowView.layoutMetrics.frame.size.width,
        mutation.newChildShadowView.layoutMetrics.frame.size.height);
  }
}

// MARK: Start Animation

ShadowView LayoutAnimationsProxy::createLayoutAnimation(
    ShadowView &before,
    const ShadowView &after,
    const Tag parentTag) const {
  auto count = 1;
  const auto tag = after.tag;
  auto layoutAnimationIt = layoutAnimations_.find(tag);
  auto &oldView = before;

  if (layoutAnimationIt != layoutAnimations_.end()) {
    auto &layoutAnimation = layoutAnimationIt->second;
    oldView = layoutAnimation.currentView;
    count = layoutAnimation.count + 1;
  }

  auto finalView = after;
  auto currentView = oldView;
  auto startView = oldView;

  auto la =
      LayoutAnimation{finalView, currentView, startView, parentTag, {}, count};

  layoutAnimations_.insert_or_assign(tag, std::move(la));

  return oldView;
}

void LayoutAnimationsProxy::startEnteringAnimation(
    const LightNode::Unshared &node) const {
  auto newChildShadowView = node->current;
  auto finalView = newChildShadowView;
  auto currentView = newChildShadowView;

  const auto &props = newChildShadowView.props;
  auto &viewProps = static_cast<const ViewProps &>(*props);
  const auto opacity = viewProps.opacity;
  const auto parentTag = node->parent.lock()->current.tag;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(),
                              finalView,
                              currentView,
                              newChildShadowView,
                              parentTag,
                              opacity]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    Rect window{};
    const auto tag = newChildShadowView.tag;
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      auto la = LayoutAnimation{
          newChildShadowView,
          newChildShadowView,
          newChildShadowView,
          parentTag,
          opacity};
      strongThis->layoutAnimations_.insert_or_assign(tag, std::move(la));
      window =
          strongThis->surfaceManager.getWindow(newChildShadowView.surfaceId);
    }

    Snapshot values(newChildShadowView, window);
    auto &uiRuntime = strongThis->uiRuntime_;
    jsi::Object yogaValues(uiRuntime);
    yogaValues.setProperty(uiRuntime, "targetOriginX", values.x);
    yogaValues.setProperty(uiRuntime, "targetGlobalOriginX", values.x);
    yogaValues.setProperty(uiRuntime, "targetOriginY", values.y);
    yogaValues.setProperty(uiRuntime, "targetGlobalOriginY", values.y);
    yogaValues.setProperty(uiRuntime, "targetWidth", values.width);
    yogaValues.setProperty(uiRuntime, "targetHeight", values.height);
    yogaValues.setProperty(uiRuntime, "windowWidth", values.windowWidth);
    yogaValues.setProperty(uiRuntime, "windowHeight", values.windowHeight);
    strongThis->layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime, tag, LayoutAnimationType::ENTERING, yogaValues);
  });
}

void LayoutAnimationsProxy::startExitingAnimation(
    const LightNode::Unshared &node) const {
  auto &oldChildShadowView = node->current;
  const auto surfaceId = oldChildShadowView.surfaceId;
  const auto tag = oldChildShadowView.tag;
  const auto parentTag = node->parent.lock()->current.tag;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(),
                              tag,
                              parentTag,
                              oldChildShadowView,
                              surfaceId]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = oldChildShadowView;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      oldView = strongThis->createLayoutAnimation(oldView, oldView, parentTag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    Snapshot values(oldView, window);

    auto &uiRuntime = strongThis->uiRuntime_;
    jsi::Object yogaValues(uiRuntime);
    yogaValues.setProperty(uiRuntime, "currentOriginX", values.x);
    yogaValues.setProperty(uiRuntime, "currentGlobalOriginX", values.x);
    yogaValues.setProperty(uiRuntime, "currentOriginY", values.y);
    yogaValues.setProperty(uiRuntime, "currentGlobalOriginY", values.y);
    yogaValues.setProperty(uiRuntime, "currentWidth", values.width);
    yogaValues.setProperty(uiRuntime, "currentHeight", values.height);
    yogaValues.setProperty(uiRuntime, "windowWidth", values.windowWidth);
    yogaValues.setProperty(uiRuntime, "windowHeight", values.windowHeight);
    strongThis->layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime, tag, LayoutAnimationType::EXITING, yogaValues);
    strongThis->layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
  });
}

void LayoutAnimationsProxy::startLayoutAnimation(
    const LightNode::Unshared &node) const {
  auto oldChildShadowView = node->previous;
  auto newChildShadowView = node->current;
  auto surfaceId = oldChildShadowView.surfaceId;
  const auto tag = oldChildShadowView.tag;
  const auto parentTag = node->parent.lock()->current.tag;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(),
                              surfaceId,
                              oldChildShadowView,
                              newChildShadowView,
                              parentTag,
                              tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = oldChildShadowView;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      oldView = strongThis->createLayoutAnimation(
          oldView, newChildShadowView, parentTag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    Snapshot currentValues(oldView, window);
    Snapshot targetValues(newChildShadowView, window);

    auto &uiRuntime = strongThis->uiRuntime_;
    jsi::Object yogaValues(uiRuntime);
    yogaValues.setProperty(uiRuntime, "currentOriginX", currentValues.x);
    yogaValues.setProperty(uiRuntime, "currentGlobalOriginX", currentValues.x);
    yogaValues.setProperty(uiRuntime, "currentOriginY", currentValues.y);
    yogaValues.setProperty(uiRuntime, "currentGlobalOriginY", currentValues.y);
    yogaValues.setProperty(uiRuntime, "currentWidth", currentValues.width);
    yogaValues.setProperty(uiRuntime, "currentHeight", currentValues.height);
    yogaValues.setProperty(uiRuntime, "targetOriginX", targetValues.x);
    yogaValues.setProperty(uiRuntime, "targetGlobalOriginX", targetValues.x);
    yogaValues.setProperty(uiRuntime, "targetOriginY", targetValues.y);
    yogaValues.setProperty(uiRuntime, "targetGlobalOriginY", targetValues.y);
    yogaValues.setProperty(uiRuntime, "targetWidth", targetValues.width);
    yogaValues.setProperty(uiRuntime, "targetHeight", targetValues.height);
    yogaValues.setProperty(uiRuntime, "windowWidth", targetValues.windowWidth);
    yogaValues.setProperty(
        uiRuntime, "windowHeight", targetValues.windowHeight);
    strongThis->layoutAnimationsManager_->startLayoutAnimation(
        uiRuntime, tag, LayoutAnimationType::LAYOUT, yogaValues);
  });
}

void LayoutAnimationsProxy::startSharedTransition(
    const int tag,
    const ShadowView &before,
    const ShadowView &after,
    SurfaceId surfaceId) const {
  uiScheduler_->scheduleOnUI(
      [weakThis = weak_from_this(), before, after, surfaceId, tag]() {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }

        auto oldView = before;
        Rect window{};
        {
          auto &mutex = strongThis->mutex;
          auto lock = std::unique_lock<std::recursive_mutex>(mutex);
          oldView =
              strongThis->createLayoutAnimation(oldView, after, surfaceId);
          window = strongThis->surfaceManager.getWindow(surfaceId);
        }

        auto &uiRuntime = strongThis->uiRuntime_;
        auto propsDiffer = PropsDiffer(uiRuntime, oldView, after);

        const auto &propsDiff = propsDiffer.computeDiff(uiRuntime);

        propsDiff.setProperty(uiRuntime, "windowWidth", window.width);
        propsDiff.setProperty(uiRuntime, "windowHeight", window.height);

        strongThis->layoutAnimationsManager_->startLayoutAnimation(
            uiRuntime,
            tag,
            LayoutAnimationType::SHARED_ELEMENT_TRANSITION,
            propsDiff);
      });
}

void LayoutAnimationsProxy::startProgressTransition(
    const int tag,
    const ShadowView &before,
    const ShadowView &after,
    SurfaceId surfaceId) const {
  uiScheduler_->scheduleOnUI(
      [weakThis = weak_from_this(), before, after, surfaceId]() {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }

        auto oldView = before;
        Rect window{};
        {
          auto &mutex = strongThis->mutex;
          auto lock = std::unique_lock<std::recursive_mutex>(mutex);
          oldView =
              strongThis->createLayoutAnimation(oldView, after, surfaceId);
          window = strongThis->surfaceManager.getWindow(surfaceId);
        }
      });
}

// MARK: Position Calculation

std::vector<react::Point>
LayoutAnimationsProxy::getAbsolutePositionsForRootPathView(
    const LightNode::Unshared &node) const {
  std::vector<react::Point> viewsAbsolutePositions;
  auto currentNode = node;
  while (currentNode) {
    react::Point viewPosition;
    if (!strcmp(currentNode->current.componentName, "ScrollView")) {
      auto state = std::static_pointer_cast<const ScrollState>(
          currentNode->current.state);
      auto data = state->getData();
      viewPosition -= data.contentOffset;
    }
    if (!strcmp(currentNode->current.componentName, "RNSScreen") &&
        currentNode->children.size() >= 2) {
      const auto &parent = currentNode->parent.lock();
      if (parent) {
        float headerHeight = parent->current.layoutMetrics.frame.size.height -
            currentNode->current.layoutMetrics.frame.size.height;
        viewPosition.y += headerHeight;
      }
    }
    viewPosition += currentNode->current.layoutMetrics.frame.origin;
    viewsAbsolutePositions.emplace_back(viewPosition);
    currentNode = currentNode->parent.lock();
  }
  for (long int i = viewsAbsolutePositions.size() - 2; i >= 0; --i) {
    viewsAbsolutePositions[i] += viewsAbsolutePositions[i + 1];
  }
  return viewsAbsolutePositions;
}

std::optional<Transform> LayoutAnimationsProxy::parseParentTransforms(
    const LightNode::Unshared &node,
    const std::vector<react::Point> &absolutePositions) const {
  std::vector<std::pair<Transform, TransformOrigin>> transforms;
  auto currentNode = node;
  while (currentNode) {
    const auto &props =
        static_cast<const ViewProps &>(*currentNode->current.props);
    auto origin = props.transformOrigin;
    const auto &viewSize = currentNode->current.layoutMetrics.frame.size;
    if (origin.xy[0].unit == facebook::react::UnitType::Percent) {
      origin.xy[0] = {
          static_cast<float>(viewSize.width * origin.xy[0].value / 100),
          UnitType::Point};
    } else if (origin.xy[0].unit == facebook::react::UnitType::Undefined) {
      origin.xy[0] = {
          static_cast<float>(viewSize.width * 0.5), UnitType::Point};
    }
    if (origin.xy[1].unit == facebook::react::UnitType::Percent) {
      origin.xy[1] = {
          static_cast<float>(viewSize.height * origin.xy[1].value / 100),
          UnitType::Point};
    } else if (origin.xy[1].unit == facebook::react::UnitType::Undefined) {
      origin.xy[1] = {
          static_cast<float>(viewSize.height * 0.5), UnitType::Point};
    }
    transforms.emplace_back(props.transform, origin);
    currentNode = currentNode->parent.lock();
  }

  const auto &targetViewPosition = absolutePositions[0];
  Transform combinedMatrix;
  bool parentHasTransform = false;
  for (long int i = transforms.size() - 1; i >= 0; --i) {
    auto &[transform, transformOrigin] = transforms[i];
    if (transform.operations.empty()) {
      continue;
    } else if (i > 0) {
      parentHasTransform = true;
    }
    if (i == 0 && !parentHasTransform) {
      // If only target view has transform, lets skip it, to matrix
      // decomposition in JS
      break;
    }
    transformOrigin.xy[0].value -=
        targetViewPosition.x - absolutePositions[i].x;
    transformOrigin.xy[1].value -=
        targetViewPosition.y - absolutePositions[i].y;
    combinedMatrix =
        combinedMatrix *
        resolveTransform(
            node->current.layoutMetrics, transform, transformOrigin);
    combinedMatrix.operations.clear();
  }
  if (parentHasTransform) {
    return Transform::FromTransformOperation(
        react::TransformOperation(TransformOperationType::Arbitrary),
        {},
        combinedMatrix);
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
      transform.operations[0].type ==
          facebook::react::TransformOperationType::Arbitrary) {
    transformMatrix = transform;
  } else {
    for (const auto &operation : transform.operations) {
      transformMatrix = transformMatrix *
          Transform::FromTransformOperation(
                            operation, layoutMetrics.frame.size, transform);
    }
  }

  if (transformOrigin.isSet()) {
    std::array<float, 3> translateOffsets = getTranslateForTransformOrigin(
        frameSize.width, frameSize.height, transformOrigin);
    transformMatrix =
        Transform::Translate(
            translateOffsets[0], translateOffsets[1], translateOffsets[2]) *
        transformMatrix *
        Transform::Translate(
            -translateOffsets[0], -translateOffsets[1], -translateOffsets[2]);
  }

  return transformMatrix;
}

std::array<float, 3> LayoutAnimationsProxy::getTranslateForTransformOrigin(
    float viewWidth,
    float viewHeight,
    const TransformOrigin &transformOrigin) const {
  float viewCenterX = viewWidth / 2;
  float viewCenterY = viewHeight / 2;

  std::array<float, 3> origin = {viewCenterX, viewCenterY, transformOrigin.z};

  for (size_t i = 0; i < transformOrigin.xy.size(); ++i) {
    const auto &currentOrigin = transformOrigin.xy[i];
    if (currentOrigin.unit == UnitType::Point) {
      origin[i] = currentOrigin.value;
    } else if (currentOrigin.unit == UnitType::Percent) {
      origin[i] =
          ((i == 0) ? viewWidth : viewHeight) * currentOrigin.value / 100.0f;
    }
  }

  float newTranslateX = -viewCenterX + origin[0];
  float newTranslateY = -viewCenterY + origin[1];
  float newTranslateZ = origin[2];

  return {newTranslateX, newTranslateY, newTranslateZ};
}

} // namespace reanimated
