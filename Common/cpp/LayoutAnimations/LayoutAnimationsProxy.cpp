#include "LayoutAnimationsProxy.h"
#include <react/renderer/mounting/ShadowViewMutation.h>
#include "NativeReanimatedModule.h"

namespace reanimated {
MutationNode::MutationNode(ShadowViewMutation& mutation, RootNode& root): children(std::move(root.children)), tag(root.tag), mutation(mutation){}

void LayoutAnimationsProxy::startEnteringAnimation(
    const int tag,
    Values values) const {
      LOG(INFO)<<"start entering animation for tag "<<tag<<std::endl;
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [values, this, tag]() {
        jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
        jsi::Object yogaValues(rt);
        yogaValues.setProperty(rt, "targetOriginX", values.x);
        yogaValues.setProperty(rt, "targetOriginY", values.y);
        yogaValues.setProperty(rt, "targetWidth", values.width);
        yogaValues.setProperty(rt, "targetHeight", values.height);
        yogaValues.setProperty(rt, "windowWidth", windowWidth);
        yogaValues.setProperty(rt, "windowHeight", windowHeight);
        nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
            rt, tag, LayoutAnimationType::ENTERING, yogaValues);
      });
}

void LayoutAnimationsProxy::startExitingAnimation(
    const int tag,
    Values values) const {
      LOG(INFO)<<"start exiting animation for tag "<<tag<<std::endl;
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [values, this, tag]() {
        jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
        jsi::Object yogaValues(rt);
        yogaValues.setProperty(rt, "currentOriginX", values.x);
        yogaValues.setProperty(rt, "currentOriginY", values.y);
        yogaValues.setProperty(rt, "currentWidth", values.width);
        yogaValues.setProperty(rt, "currentHeight", values.height);
        yogaValues.setProperty(rt, "windowWidth", windowWidth);
        yogaValues.setProperty(rt, "windowHeight", windowHeight);
        nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
            rt, tag, LayoutAnimationType::EXITING, yogaValues);
          layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
      });
}

void LayoutAnimationsProxy::startLayoutLayoutAnimation(
    const int tag,
    Values currentValues,
    Values targetValues) const {
      LOG(INFO)<<"start layout animation for tag "<<tag<<std::endl;
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [currentValues, targetValues, this, tag]() {
        jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
        jsi::Object yogaValues(rt);
        yogaValues.setProperty(rt, "currentOriginX", currentValues.x);
        yogaValues.setProperty(rt, "currentOriginY", currentValues.y);
        yogaValues.setProperty(rt, "currentWidth", currentValues.width);
        yogaValues.setProperty(rt, "currentHeight", currentValues.height);
        yogaValues.setProperty(rt, "targetOriginX", targetValues.x);
        yogaValues.setProperty(rt, "targetOriginY", targetValues.y);
        yogaValues.setProperty(rt, "targetWidth", targetValues.width);
        yogaValues.setProperty(rt, "targetHeight", targetValues.height);
        yogaValues.setProperty(rt, "windowWidth", windowWidth);
        yogaValues.setProperty(rt, "windowHeight", windowHeight);
        nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
            rt, tag, LayoutAnimationType::LAYOUT, yogaValues);
      });
}

void LayoutAnimationsProxy::transferConfigFromNativeTag(const std::string nativeIdString, const int tag) const{
  if (nativeIdString.empty()){
    return;
  }
  auto nativeId = stoi(nativeIdString);
  std::shared_ptr<Shareable> config = nullptr;
    {
        auto lock = std::unique_lock<std::recursive_mutex>(
                nativeReanimatedModule_->layoutAnimationsManager_->animationsMutex_);
        config = layoutAnimationsManager_->enteringAnimations_[nativeId];
        if (config) {
            layoutAnimationsManager_->enteringAnimations_.insert_or_assign(tag, config);
        }
        layoutAnimationsManager_->enteringAnimations_.erase(nativeId);
    }
}

void LayoutAnimationsProxy::cancelAnimation(const int tag) const{
  bannedTags.insert(tag);
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
                                                      [this, tag]() {
                                                        jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
                                                        nativeReanimatedModule_->layoutAnimationsManager().cancelLayoutAnimation(rt, tag);
                                                      });
}


void LayoutAnimationsProxy::progressLayoutAnimation(
    int tag,
    const jsi::Object &newStyle) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  LOG(INFO)<<"progress layout animation for tag "<< tag<<std::endl;
  if (bannedTags.contains(tag)){
    return;
  }
  // opacity was set to 0 on insert, so we restore it here (hopefully there will be a better place to do it)
  // TODO: restore the original opacity instead of 1
  if (!newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "opacity")){
    newStyle.setProperty(nativeReanimatedModule_->getUIRuntime(), "opacity", jsi::Value(1));
  }
  auto newProps = std::make_shared<RawProps>(
      nativeReanimatedModule_->getUIRuntime(),
      jsi::Value(nativeReanimatedModule_->getUIRuntime(), newStyle));
  X x;
  x.rawProps = newProps;
  LayoutMetrics lm;

  lm.frame.origin.x =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "originX")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "originX")
            .asNumber()
      : -1;
  lm.frame.origin.y =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "originY")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "originY")
            .asNumber()
      : -1;
  lm.frame.size.width =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "width")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "width")
            .asNumber()
      : -1;
  lm.frame.size.height =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "height")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "height")
            .asNumber()
      : -1;

  x.layoutMetrics = lm;
  //TODO: investigate
  if (!layoutAnimations_.contains(tag)){
    return;
  }
  PropsParserContext propsParserContext{layoutAnimations_.at(tag).end->surfaceId, *contextContainer_};
  x.newProps = getComponentDescriptorForShadowView(*layoutAnimations_.at(tag).end).cloneProps(propsParserContext, layoutAnimations_.at(tag).end->props, std::move(*newProps));
  auto& props = surfaceManager.getProps(layoutAnimations_.at(tag).end->surfaceId);
  props.insert_or_assign(tag, x);
  
  LOG(INFO)<< "free lock" <<std::endl;
}

void LayoutAnimationsProxy::endLayoutAniamtion(int tag, bool shouldRemove) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  LOG(INFO)<<"end layout animation for "<<tag<<" - should remove "<< shouldRemove<<std::endl;
  if (bannedTags.contains(tag)){
    return;
  }
  if (shouldRemove) {
    if (nodeForTag.contains(tag)){
      auto node = nodeForTag.at(tag);
      endAnimationsRecursively(node, cleanupMutations);
      if (node->parent){
        maybeDropAncestors(node->parent, node);
      }
      if (node->root){
        node->root->removeChild(node);
      }
    }
  }
  auto& props = surfaceManager.getProps(layoutAnimations_.at(tag).end->surfaceId);
  layoutAnimations_.erase(tag);
  props.erase(tag);
  
  LOG(INFO)<< "free lock" <<std::endl;
}

void LayoutAnimationsProxy::endAnimationsRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList& mutations) const{
  nodeForTag.erase(node->tag);
  node->isDone = true;
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++) {
    auto &subNode = *it;
    if (!subNode->isDone) {
      cancelAnimation(subNode->tag);
      endAnimationsRecursively(subNode, mutations);
    }
  }
  mutations.push_back(node->mutation);
  if (node->isExiting){
    dropIndex(node->mutation.parentShadowView.tag, node->mutation.index);
  }
  updateIndices(node->mutation);
  nodeForTag.erase(node->tag);
  LOG(INFO) << "delete "<<node->tag<<std::endl;
  mutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
}

void LayoutAnimationsProxy::maybeDropAncestors(std::shared_ptr<MutationNode> node, std::shared_ptr<MutationNode> child) const{
  node->animatedChildren.erase(child->tag);
  node->removeChild(child);
  if (node->animatedChildren.empty() && !node->isAnimatingExit){
    for (auto subNode: node->children){
      endAnimationsRecursively(subNode, cleanupMutations);
    }
    nodeForTag.erase(node->tag);
    cleanupMutations.push_back(node->mutation);
    if (layoutAnimations_.contains(node->tag)){
      cancelAnimation(node->tag);
    }
    dropIndex(node->mutation.parentShadowView.tag, node->mutation.index);
    updateIndices(node->mutation);
    LOG(INFO) << "delete "<<node->tag<<std::endl;
    cleanupMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
    if (node->parent){
      maybeDropAncestors(node->parent, node);
    }
    if (node->root){
      node->root->removeChild(node);
    }
  }
}

// bool LayoutAnimationKeyFrameManager::hasComponentDescriptorForShadowView(
//     const ShadowView& shadowView) const {
//   return componentDescriptorRegistry_->hasComponentDescriptorAt(
//       shadowView.componentHandle);
// }

const ComponentDescriptor &
LayoutAnimationsProxy::getComponentDescriptorForShadowView(
    const ShadowView &shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
}

// static inline bool shouldFirstComeBeforeSecondRemovesOnly(
//     const ShadowViewMutation& lhs,
//     const ShadowViewMutation& rhs) noexcept {
//   // Make sure that removes on the same level are sorted - highest indices
//   must
//   // come first.
//   return (lhs.type == ShadowViewMutation::Type::Remove &&
//           lhs.type == rhs.type) &&
//       (lhs.parentShadowView.tag == rhs.parentShadowView.tag) &&
//       (lhs.index > rhs.index);
// }

static inline bool shouldFirstComeBeforeSecondMutation(
    const ShadowViewMutation &lhs,
    const ShadowViewMutation &rhs) noexcept {
  if (lhs.type != rhs.type) {
    // Deletes always come last
    if (lhs.type == ShadowViewMutation::Type::Delete) {
      return false;
    }
    if (rhs.type == ShadowViewMutation::Type::Delete) {
      return true;
    }

    // Remove comes before insert
    if (lhs.type == ShadowViewMutation::Type::Remove &&
        rhs.type == ShadowViewMutation::Type::Insert) {
      return true;
    }
    if (rhs.type == ShadowViewMutation::Type::Remove &&
        lhs.type == ShadowViewMutation::Type::Insert) {
      return false;
    }

    // Create comes before insert
    if (lhs.type == ShadowViewMutation::Type::Create &&
        rhs.type == ShadowViewMutation::Type::Insert) {
      return true;
    }
    if (rhs.type == ShadowViewMutation::Type::Create &&
        lhs.type == ShadowViewMutation::Type::Insert) {
      return false;
    }
  } else {
    // Make sure that removes on the same level are sorted - highest indices
    // must come first.
    if (lhs.type == ShadowViewMutation::Type::Remove &&
        lhs.parentShadowView.tag == rhs.parentShadowView.tag) {
      if (lhs.index > rhs.index) {
        return true;
      } else {
        return false;
      }
    }
  }

  return false;
}

void LayoutAnimationsProxy::addOngoingAnimations(
    SurfaceId surfaceId,
    ShadowViewMutationList &mutations) const {
//  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
    auto& props = surfaceManager.getProps(surfaceId);
  for (auto &[tag, x] : props) {
    auto rawProps = x.rawProps;
    if (!layoutAnimations_.contains(tag)) {
      continue;
    }
    auto &la = layoutAnimations_.at(tag);
    auto &previous = la.current;
    auto &finalView = la.end;
    auto parent = la.parent;
    auto newView = std::make_shared<ShadowView>(*finalView);
//    const auto &viewProps = static_cast<const ViewProps &>(*newView->props);
//    const_cast<ViewProps &>(viewProps).opacity = 1;
//    auto newProps = getComponentDescriptorForShadowView(*newView).cloneProps(
//        propsParserContext, newView->props, *rawProps);
    newView->props = x.newProps;
    auto f = x.layoutMetrics.frame;
    if (f.size.width != -1) {
      newView->layoutMetrics.frame.size.width = f.size.width;
    }
    if (f.size.height != -1) {
      newView->layoutMetrics.frame.size.height = f.size.height;
    }
    if (f.origin.x != -1) {
      newView->layoutMetrics.frame.origin.x = f.origin.x;
    }
    if (f.origin.y != -1) {
      newView->layoutMetrics.frame.origin.y = f.origin.y;
    }

    if (!la.initialMutations.empty()) {
      for (auto mutation : la.initialMutations) {
        mutation.newChildShadowView = *newView;
        mutations.push_back(mutation);
      }
      la.initialMutations.clear();
    } else {
      mutations.push_back(
          ShadowViewMutation::UpdateMutation(*previous, *newView, parent));
    }
    la.current = newView;
  }
  props.clear();
  mutations.insert(
      mutations.end(), cleanupMutations.begin(), cleanupMutations.end());
  cleanupMutations.clear();
  std::stable_sort(
      mutations.begin(), mutations.end(), &shouldFirstComeBeforeSecondMutation);
}

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
      LOG(INFO)<<"\n pullTransaction "<< std::this_thread::get_id()<<" "<<surfaceId<<std::endl;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  //  std::unordered_map<Tag, const RawProps*> propsMap =
  //  layoutAnimationsRegistry_.props_;
  ShadowViewMutationList filteredMutations;

  std::vector<std::shared_ptr<MutationNode>> roots;

  std::set<Tag> removedTags;

  // TODO: filter reparentings
  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    auto &mutation = *it;
    if (mutation.type == ShadowViewMutation::Delete){
      removedTags.insert(mutation.oldChildShadowView.tag);
    }
    if (mutation.type == ShadowViewMutation::Remove && removedTags.contains(mutation.oldChildShadowView.tag)) {
      updateIndexForMutation(mutation);
      auto tag = mutation.oldChildShadowView.tag;
      auto parentTag = mutation.parentShadowView.tag;
//      auto parentTag = mutation.parentTag; TODO: uncomment
      if (!nodeForTag.contains(tag)) {
        if (rootNodeForTag.contains(tag)){
          auto rootNode = rootNodeForTag.at(tag);
          rootNodeForTag.erase(tag);
          auto node = std::make_shared<MutationNode>(mutation, *rootNode);
          for (auto subNode: node->children){
            subNode->parent = node;
          }
          nodeForTag.insert_or_assign(tag, node);
        } else {
          nodeForTag.insert_or_assign(tag, std::make_shared<MutationNode>(mutation));
        }
      }
      auto &node = nodeForTag.at(tag);
      node->tag = tag;
      
      if (nodeForTag.contains(parentTag)){
        auto &parent = nodeForTag.at(parentTag);
        parent->addChild(node);
        node->parent = parent;
      } else {
        if (!rootNodeForTag.contains(parentTag)){
          auto rootNode = std::make_shared<RootNode>();
          rootNode->tag = parentTag;
          rootNodeForTag.insert_or_assign(parentTag, rootNode);
        }
        auto rootNode = rootNodeForTag.at(parentTag);
        rootNode->addChild(node);
        node->root = rootNode;
        roots.push_back(node);
      }
    }
  }
  
  // current assumptions -- collapsable false on exiting

  // filter DELETE+CREATE -- (ignore - reparent) (probably view flattening?) |
  // keep mutations
  std::set<Tag> reparentedTags;

  // filter REMOVE+INSERT -- treat as update (probably reordering) | keep
  // mutations and animate update
  std::set<Tag> reorderedTags;

      for (auto it= roots.rbegin(); it != roots.rend(); it++) {
        auto &node = *it;
//      if (node->mutation.oldChildShadowView.traits.check(facebook::react::ShadowNodeTraits::RootNodeKind)) {
////        removeRecursively(node, filteredMutations);
//        endAnimationsRecursively(node, filteredMutations);
//        node->root->removeChild(node);
//      } else 
        if (!startAnimationsRecursively(node, true, true, filteredMutations)) {
          if (layoutAnimations_.contains(node->tag)){
            cancelAnimation(node->tag);
          }
        filteredMutations.push_back(node->mutation);
        updateIndices(node->mutation);
        nodeForTag.erase(node->tag);
        node->root->removeChild(node);
        LOG(INFO) << "delete "<<node->tag<<std::endl;
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
      }
  }

  // loop
  for (auto &mutation : mutations) {
    if (mutation.parentShadowView.tag == 1){
      windowWidth = mutation.parentShadowView.layoutMetrics.frame.size.width;
      windowHeight = mutation.parentShadowView.layoutMetrics.frame.size.height;
    }
    
    switch (mutation.type) {
        // INSERT (w/o REMOVE) -- animate entering | override mutation - opacity
        // 0
      case ShadowViewMutation::Type::Create:{
        if (!layoutAnimationsManager_->hasLayoutAnimation(
                mutation.newChildShadowView.tag,
                LayoutAnimationType::ENTERING)) {
          filteredMutations.push_back(mutation);
          continue;
        }
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Type::Insert: {
        updateIndexForMutation(mutation);
        updateIndices(mutation);
        transferConfigFromNativeTag(mutation.newChildShadowView.props->nativeId, mutation.newChildShadowView.tag);
        if (!layoutAnimationsManager_->hasLayoutAnimation(
                mutation.newChildShadowView.tag,
                LayoutAnimationType::ENTERING)) {
          filteredMutations.push_back(mutation);
          continue;
        }
        
        auto finalView =
            std::make_shared<ShadowView>(mutation.newChildShadowView);
        auto current =
            std::make_shared<ShadowView>(mutation.oldChildShadowView);
        LayoutAnimation la{
            finalView,
            current,
            mutation.oldChildShadowView,
            mutation.parentShadowView,
            {},
            {}};
        layoutAnimations_.insert_or_assign(mutation.newChildShadowView.tag, la);
        filteredMutations.push_back(mutation);
        startEnteringAnimation(
            mutation.newChildShadowView.tag,
            Values(mutation.newChildShadowView));
        
        // temporarily set opacity to 0 to prevent flickering on android
        auto newView = std::make_shared<ShadowView>(*finalView);
        folly::dynamic d = folly::dynamic::object("opacity", 0);
        auto newProps = getComponentDescriptorForShadowView(*newView).cloneProps(propsParserContext, newView->props, RawProps(d));
        newView->props = newProps;
        filteredMutations.push_back(ShadowViewMutation::UpdateMutation(mutation.newChildShadowView, *newView, mutation.parentShadowView));
        break;
      }

        // UPDATE -- animate layout | ignore mutation
      case ShadowViewMutation::Type::Update: {
        if (!layoutAnimationsManager_->hasLayoutAnimation(
                mutation.newChildShadowView.tag, LayoutAnimationType::LAYOUT)) {
          filteredMutations.push_back(mutation);
          continue;
        }
        auto &oldChild = mutation.oldChildShadowView;
        if (layoutAnimations_.contains(mutation.newChildShadowView.tag)) {
          oldChild =
              *layoutAnimations_.at(mutation.newChildShadowView.tag).current;
        }
        auto finalView =
            std::make_shared<ShadowView>(mutation.newChildShadowView);
        auto current = std::make_shared<ShadowView>(oldChild);
        LayoutAnimation la{
            finalView, current, oldChild, mutation.parentShadowView, {}, {}};
        layoutAnimations_.insert_or_assign(mutation.newChildShadowView.tag, la);
        startLayoutLayoutAnimation(
            mutation.newChildShadowView.tag,
            Values(oldChild),
            Values(mutation.newChildShadowView));
        break;
      }

        // REMOVE (w/o INSERT) -- animated exiting | delay mutation, mark the
        // index as used by us
      case ShadowViewMutation::Type::Remove: {
        if (!removedTags.contains(mutation.oldChildShadowView.tag)){
          updateIndexForMutation(mutation);
          filteredMutations.push_back(mutation);
          updateIndices(mutation);
        }

        break;
      }

      case ShadowViewMutation::Type::Delete: {
        break;
      }

        // CREATE, REMOVEDRELETETREE
      default:
        filteredMutations.push_back(mutation);
    }

    // REMOVE (w/o INSERT) -- animated exiting | delay mutation, mark the index
    // as used by us
  }
  // fix indices in mutations

  // add ongoing updates
  //  }

  addOngoingAnimations(surfaceId, filteredMutations);

      LOG(INFO)<< "free lock" <<std::endl;
  //  layoutAnimationsRegistry_.props_.clear();
  return MountingTransaction{
      surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

//void LayoutAnimationsProxy::removeRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList &mutations) const{
//  for (auto it = node->children.rbegin(); it != node->children.rend(); it++){
//    auto &subNode = *it;
//    removeRecursively(subNode, mutations);
//  }
//
//  if (!node->isDone && node->isExiting) {
//    layoutAnimationsManager_->cancelLayoutAnimation(nativeReanimatedModule_->getUIRuntime(), node->tag);
//  }
//
//  mutations.push_back(node->mutation);
//  updateIndices(node->mutation);
//  mutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
//  nodeForTag.erase(node->tag);
//}

bool LayoutAnimationsProxy::startAnimationsRecursively(std::shared_ptr<MutationNode> node, bool shouldRemoveSubviewsWithoutAnimations, bool shouldAnimate, ShadowViewMutationList& mutations) const{
  shouldAnimate = layoutAnimationsManager_->shouldAnimateExiting(node->tag, shouldAnimate);
  if (!std::strcmp(node->mutation.oldChildShadowView.componentName, "RNSScreenStack") || !std::strcmp(node->mutation.oldChildShadowView.componentName, "RNSScreen")){
    shouldAnimate = false;
  }
  bool hasExitAnimation = shouldAnimate && layoutAnimationsManager_->hasLayoutAnimation(node->tag, LayoutAnimationType::EXITING);
  bool hasAnimatedChildren = false;
  
  shouldRemoveSubviewsWithoutAnimations = shouldRemoveSubviewsWithoutAnimations && !hasExitAnimation;
  std::vector<std::shared_ptr<MutationNode>> toBeRemoved;

  for (auto it = node->children.rbegin(); it != node->children.rend(); it++){
    auto &subNode = *it;
    LOG(INFO) << "child "<<subNode->tag<< " "<<subNode->isExiting<<" "<<shouldAnimate<<" "<<shouldRemoveSubviewsWithoutAnimations<< std::endl;
    if (subNode->isExiting){
      if (shouldAnimate){
        node->animatedChildren.insert(subNode->tag);
        hasAnimatedChildren = true;
      }
      else {
        cancelAnimation(subNode->tag);
        endAnimationsRecursively(subNode, mutations);
      }
    } else if (startAnimationsRecursively(subNode, shouldRemoveSubviewsWithoutAnimations, shouldAnimate, mutations)) {
      LOG(INFO) << "child "<<subNode->tag<< " start animations returned true "<<std::endl;
      node->animatedChildren.insert(subNode->tag);
      hasAnimatedChildren = true;
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      if (layoutAnimations_.contains(subNode->tag)){
        cancelAnimation(subNode->tag);
      }
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
      updateIndices(subNode->mutation);
      nodeForTag.erase(subNode->tag);
      LOG(INFO) << "delete "<<subNode->tag<<std::endl;
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->mutation.oldChildShadowView));
    }
    
//    if ((shouldAnimate && subNode->isAnimatingExit) || startAnimationsRecursively(subNode, shouldRemoveSubviewsWithoutAnimations, shouldAnimate, mutations)){
//      node->animatedChildren.insert(subNode->tag);
//      hasAnimatedChildren = true;
//    } else if (subNode -> isAnimatingExit){
//      layoutAnimationsManager_->cancelLayoutAnimation(nativeReanimatedModule_->getUIRuntime(), subNode->tag);
//      endAnimationsRecursively(subNode, mutations);
//    } else if (shouldRemoveSubviewsWithoutAnimations) {
//      mutations.push_back(subNode->mutation);
//      updateIndices(subNode->mutation);
//      nodeForTag.erase(subNode->tag);
//      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->mutation.oldChildShadowView));
//    }
  }
  
  for (auto& subNode: toBeRemoved){
    node->removeChild(subNode);
  }
  
  bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    
    node->isAnimatingExit = true;
    auto &mutation = node->mutation;
    auto finalView = std::make_shared<ShadowView>(mutation.oldChildShadowView);
    auto current = std::make_shared<ShadowView>(mutation.oldChildShadowView);
    LayoutAnimation la{
        finalView,
        current,
        mutation.oldChildShadowView,
        mutation.parentShadowView,
        {},
        {}};
    layoutAnimations_.insert_or_assign(mutation.oldChildShadowView.tag, la);
    startExitingAnimation(node->tag, Values(node->mutation.oldChildShadowView));
  }

  if (!wantAnimateExit) {
    return false;
  }

  node->isExiting = true;
  takeIndex(node->mutation.parentShadowView.tag, node->mutation.index);
  return true;
}

void LayoutAnimationsProxy::updateIndexForMutation(
    ShadowViewMutation &mutation) const {
  if (mutation.index == -1) {
    return;
  }
  int k = mutation.index, i = 0;
      
  int tag = mutation.type == ShadowViewMutation::Insert ? mutation.newChildShadowView.tag : mutation.oldChildShadowView.tag;

  if (!indices.contains(mutation.parentShadowView.tag)) {
    return;
  }

  // !!!
  while (true) {
    if (indices.at(mutation.parentShadowView.tag)->contains(i)) {
      i++;
      continue;
    }
    if (!k) {
      break;
    }
    k--;
    i++;
  }
      LOG(INFO)<<"update index for "<<tag<<" in "<<mutation.parentShadowView.tag<<": "<<mutation.index<<" -> "<<i<<std::endl;
      mutation.index = i;
}

void LayoutAnimationsProxy::updateIndices(ShadowViewMutation &mutation) const {
  int delta = mutation.type == ShadowViewMutation::Insert ? 1 : -1;
  if (!indices.contains(mutation.parentShadowView.tag)) {
    return;
  }

  auto &s = *indices.at(mutation.parentShadowView.tag);
  auto newS = std::make_shared<std::unordered_set<int>>();
  LOG(INFO)<<"updating indices of "<<mutation.parentShadowView.tag<<"'s children after index "<<mutation.index<<std::endl;
  std::vector<std::shared_ptr<MutationNode>> nodesToFix;
  for (auto i : s) {
    if (i < mutation.index) {
      newS->insert(i);
    } else {
      for (auto &[tag, node] : nodeForTag) {
        if (node->mutation.parentShadowView.tag == mutation.parentShadowView.tag && node->mutation.index == i) {
          // !!!
          nodesToFix.push_back(node);
          break;
        }
      }
      newS->insert(i + delta);
    }
  }
  for (auto node : nodesToFix) {
    LOG(INFO)<<"tag "<<node->mutation.oldChildShadowView.tag<<" index "<<node->mutation.index<<" -> "<<node->mutation.index + delta<<std::endl;
    node->mutation.index += delta;
  }
  indices.insert_or_assign(mutation.parentShadowView.tag, newS);
}

void LayoutAnimationsProxy::takeIndex(Tag parentTag, int index) const {
  LOG(INFO)<<"take index "<<index<<" in parent "<<parentTag<<std::endl;
  if (!indices.contains(parentTag)) {
    indices.insert_or_assign(
        parentTag, std::make_shared<std::unordered_set<int>>());
  }

  indices.at(parentTag)->insert(index);
}

void LayoutAnimationsProxy::dropIndex(Tag parentTag, int index) const {
  LOG(INFO)<<"drop index "<<index<<" in parent "<<parentTag<<std::endl;
  if (!indices.contains(parentTag)) {
    return;
  }

  indices.at(parentTag)->erase(index);
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  return true;
}

} // namespace reanimated
