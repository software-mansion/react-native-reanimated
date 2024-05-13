#include <react/renderer/animations/utils.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include "NativeReanimatedModule.h"
#include "LayoutAnimationsProxy.h"
#define LAYOUT_ANIMATIONS_LOGS
namespace reanimated {

std::optional<SurfaceId> LayoutAnimationsProxy::progressLayoutAnimation(int tag, const jsi::Object &newStyle) {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "progress layout animation for tag " << tag << std::endl;
#endif
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

//  // TODO: investigate
  if (layoutAnimationIt == layoutAnimations_.end() ||
      bannedTags.contains(tag)) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;
  auto &runtime = nativeReanimatedModule_->getUIRuntime();

  if (layoutAnimation.opacity && !newStyle.hasProperty(runtime, "opacity")) {
    newStyle.setProperty(runtime, "opacity", jsi::Value(*layoutAnimation.opacity));
    layoutAnimation.opacity.reset();
  }
  auto rawProps =
      std::make_shared<RawProps>(runtime, jsi::Value(runtime, newStyle));

  PropsParserContext propsParserContext{layoutAnimation.end->surfaceId, *contextContainer_};
  auto newProps = getComponentDescriptorForShadowView(*layoutAnimation.end).cloneProps(propsParserContext, layoutAnimations_.at(tag).end->props, std::move(*rawProps));
  auto &updateMap = surfaceManager.getUpdateMap(layoutAnimation.end->surfaceId);
  updateMap.insert_or_assign(tag, UpdateValues{newProps, Frame(runtime, newStyle)});

  return layoutAnimation.end->surfaceId;
}

std::optional<SurfaceId> LayoutAnimationsProxy::endLayoutAnimation(int tag, bool shouldRemove) {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "end layout animation for " << tag << " - should remove "
            << shouldRemove << std::endl;
#endif
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  // TODO: investigate
  if (layoutAnimationIt == layoutAnimations_.end() ||
      bannedTags.contains(tag)) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;
  
  auto surfaceId = layoutAnimation.end->surfaceId;
  auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
  layoutAnimations_.erase(tag);
  updateMap.erase(tag);
  
  if (!shouldRemove || !nodeForTag.contains(tag)){
    return {};
  }
  
  auto &cleanupMutations = surfaceManager.getCleanupMutations(surfaceId);
  auto node = nodeForTag[tag];
  auto mutationNode = std::static_pointer_cast<MutationNode>(node);
  endAnimationsRecursively(mutationNode, cleanupMutations);
  if (node->parent){
    maybeDropAncestors(node->parent, mutationNode, cleanupMutations);
  }
  
  return surfaceId;
}

void LayoutAnimationsProxy::endAnimationsRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList& mutations) const{
  node->isDone = true;
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++) {
    auto &subNode = *it;
    if (!subNode->isDone) {
      cancelAnimation(subNode->tag);
      endAnimationsRecursively(subNode, mutations);
    }
  }
  mutations.push_back(node->mutation);
  nodeForTag.erase(node->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "delete "<<node->tag<<std::endl;
#endif
  mutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
}

void LayoutAnimationsProxy::maybeDropAncestors(std::shared_ptr<Node> parent, std::shared_ptr<MutationNode> child, ShadowViewMutationList& cleanupMutations) const{
  parent->removeChild(child);
  if (parent->parent == nullptr){
    return;
  }
  
  auto node = std::static_pointer_cast<MutationNode>(parent);
  node->animatedChildren.erase(child->tag);
  
  if (node->animatedChildren.empty() && !node->isAnimatingExit){
    nodeForTag.erase(node->tag);
    cleanupMutations.push_back(node->mutation);
    if (layoutAnimations_.contains(node->tag)){
      cancelAnimation(node->tag);
    }
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "delete "<<node->tag<<std::endl;
#endif
    cleanupMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
    maybeDropAncestors(node->parent, node, cleanupMutations);
  }
}

const ComponentDescriptor &LayoutAnimationsProxy::getComponentDescriptorForShadowView(const ShadowView &shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
}

void LayoutAnimationsProxy::addOngoingAnimations(
    SurfaceId surfaceId,
    ShadowViewMutationList &mutations) const {
  auto& updateMap = surfaceManager.getUpdateMap(surfaceId);
  for (auto &[tag, updateValues] : updateMap) {
    if (!layoutAnimations_.contains(tag)) {
      continue;
    }
    auto &la = layoutAnimations_.at(tag);
    auto &previous = la.current;
    auto &finalView = la.end;
    auto parent = la.parent;
    auto newView = std::make_shared<ShadowView>(*finalView);
    newView->props = updateValues.newProps;
    auto frame = updateValues.frame;
    updateLayoutMetrics(newView->layoutMetrics, frame);

    mutations.push_back(ShadowViewMutation::UpdateMutation(*previous, *newView, parent));
    la.current = newView;
  }
  updateMap.clear();
  surfaceManager.consumeCleanupMutations(surfaceId, mutations);
  std::stable_sort(mutations.begin(), mutations.end(), &shouldFirstComeBeforeSecondMutation);
}

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO)<<"\npullTransaction "<< std::this_thread::get_id()<<" "<<surfaceId<<std::endl;
#endif
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  ShadowViewMutationList filteredMutations;

  std::vector<std::shared_ptr<MutationNode>> roots;

  std::set<Tag> deletedViews;
  std::unordered_map<Tag, std::vector<std::shared_ptr<MutationNode>>>childrenForTag;

  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    auto &mutation = *it;
    if (mutation.type == ShadowViewMutation::Delete){
      deletedViews.insert(mutation.oldChildShadowView.tag);
    }
    if (mutation.type == ShadowViewMutation::Remove && deletedViews.contains(mutation.oldChildShadowView.tag)) {
      updateIndexForMutation(mutation);
      auto tag = mutation.oldChildShadowView.tag;
      auto parentTag = mutation.parentShadowView.tag;
      // auto parentTag = mutation.parentTag; TODO: uncomment
      
      std::shared_ptr<MutationNode> mutationNode;
      std::shared_ptr<Node> node = nodeForTag[tag], parent = nodeForTag[parentTag];
      
      if (!node){
        mutationNode = std::make_shared<MutationNode>(mutation);
      } else {
        mutationNode = std::make_shared<MutationNode>(mutation, std::move(*node));
        for (auto subNode: mutationNode->children){
          subNode->parent = mutationNode;
        }
      }
      nodeForTag[tag] = mutationNode;
      
      if (!parent){
        parent = std::make_shared<Node>(parentTag);
        nodeForTag[parentTag] = parent;
      }
      
      if (!parent->parent){
        roots.push_back(mutationNode);
      }
      
      childrenForTag[parentTag].push_back(mutationNode);
      mutationNode->parent = parent;
    }
  }
      
  for (auto& [parentTag, children]: childrenForTag){
    nodeForTag[parentTag]->insertChildren(children);
  }

  for (auto it = roots.rbegin(); it != roots.rend(); it++) {
    auto &node = *it;
    if (!startAnimationsRecursively(node, true, true, filteredMutations)) {
      if (layoutAnimations_.contains(node->tag)){
        cancelAnimation(node->tag);
      }
      filteredMutations.push_back(node->mutation);
      nodeForTag.erase(node->tag);
      node->parent->removeChild(node);
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "delete "<<node->tag<<std::endl;
#endif
      filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->mutation.oldChildShadowView));
    }
  }

  for (auto &mutation : mutations) {
    if (mutation.parentShadowView.tag == surfaceId){
      surfaceManager.updateWindow(surfaceId, mutation.parentShadowView.layoutMetrics.frame.size.width, mutation.parentShadowView.layoutMetrics.frame.size.height);
    }

    Tag tag = mutation.type == 
      ShadowViewMutation::Type::Create || mutation.type == ShadowViewMutation::Type::Insert ?
        mutation.newChildShadowView.tag
        : mutation.oldChildShadowView.tag;

    switch (mutation.type) {
      case ShadowViewMutation::Type::Create:{
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Type::Insert: {
        updateIndexForMutation(mutation);
        if (nodeForTag.contains(mutation.parentShadowView.tag)){
          nodeForTag[mutation.parentShadowView.tag]->handleMutation(mutation);
        }
        transferConfigFromNativeTag(mutation.newChildShadowView.props->nativeId, mutation.newChildShadowView.tag);

        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, ENTERING)) {
          filteredMutations.push_back(mutation);
          continue;
        }

        startEnteringAnimation(tag, mutation);
        filteredMutations.push_back(mutation);

        // temporarily set opacity to 0 to prevent flickering on android
        auto newView = std::make_shared<ShadowView>(mutation.newChildShadowView);
        folly::dynamic opacity = folly::dynamic::object("opacity", 0);
        auto newProps = getComponentDescriptorForShadowView(*newView).cloneProps(propsParserContext, newView->props, RawProps(opacity));
        newView->props = newProps;

        filteredMutations.push_back(ShadowViewMutation::UpdateMutation(mutation.newChildShadowView, *newView, mutation.parentShadowView));
        break;
      }

      case ShadowViewMutation::Type::Update: {
        if (!layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)) {
          filteredMutations.push_back(mutation);
          continue;
        }
        startLayoutAnimation(tag, mutation);
        break;
      }

      case ShadowViewMutation::Type::Remove: {
        if (!deletedViews.contains(mutation.oldChildShadowView.tag)){
          updateIndexForMutation(mutation);
          filteredMutations.push_back(mutation);
          if (nodeForTag.contains(mutation.parentShadowView.tag)){
            nodeForTag[mutation.parentShadowView.tag]->handleMutation(mutation);
          }
        }

        break;
      }

      case ShadowViewMutation::Type::Delete: {
        break;
      }

        // REMOVEDRELETETREE
      default:
        filteredMutations.push_back(mutation);
    }
  }

  addOngoingAnimations(surfaceId, filteredMutations);

  return MountingTransaction{surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

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
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "child "<<subNode->tag<< " "<<subNode->isExiting<<" "<<shouldAnimate<<" "<<shouldRemoveSubviewsWithoutAnimations<< std::endl;
#endif
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
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "child "<<subNode->tag<< " start animations returned true "<<std::endl;
#endif
      node->animatedChildren.insert(subNode->tag);
      hasAnimatedChildren = true;
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      if (layoutAnimations_.contains(subNode->tag)){
        cancelAnimation(subNode->tag);
      }
      mutations.push_back(subNode->mutation);
      toBeRemoved.push_back(subNode);
      nodeForTag.erase(subNode->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "delete "<<subNode->tag<<std::endl;
#endif
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->mutation.oldChildShadowView));
    }
  }

  for (auto& subNode: toBeRemoved){
    node->removeChild(subNode);
  }

  bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->isAnimatingExit = true;
    startExitingAnimation(node->tag, node->mutation);
  }

  if (!wantAnimateExit) {
    return false;
  }

  node->isExiting = true;
  return true;
}

void LayoutAnimationsProxy::updateIndexForMutation(ShadowViewMutation &mutation) const {
  if (mutation.index == -1) {
    return;
  }
  if (!nodeForTag.contains(mutation.parentShadowView.tag)) {
    return;
  }
      
  auto parent = nodeForTag[mutation.parentShadowView.tag];
  
  int size = 0, prevIndex = -1, offset = 0;
  
  for (auto subNode: parent->children){
    size += subNode->mutation.index - prevIndex - 1;
    if (mutation.index < size){
      break;
    }
    offset++;
    prevIndex = subNode->mutation.index;
  }
#ifdef LAYOUT_ANIMATIONS_LOGS
  int tag = mutation.type == ShadowViewMutation::Insert
      ? mutation.newChildShadowView.tag
      : mutation.oldChildShadowView.tag;
  LOG(INFO)<<"update index for "<<tag<<" in "<<mutation.parentShadowView.tag<<": "<<mutation.index<<" -> "<<mutation.index + offset<<std::endl;
#endif
  mutation.index += offset;
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  return true;
}

void LayoutAnimationsProxy::startEnteringAnimation(const int tag, ShadowViewMutation& mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO)<<"start entering animation for tag "<<tag<<std::endl;
#endif
  auto finalView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  auto current = std::make_shared<ShadowView>(mutation.oldChildShadowView);
  auto& viewProps = static_cast<const ViewProps&>(*mutation.newChildShadowView.props);
  LayoutAnimation la{
      finalView,
      current,
      mutation.oldChildShadowView,
      mutation.parentShadowView,
      viewProps.opacity
  };
  layoutAnimations_.insert_or_assign(tag, la);

  Snapshot values(mutation.newChildShadowView, surfaceManager.getWindow(mutation.newChildShadowView.surfaceId));
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [values, this, tag]() {
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    jsi::Object yogaValues(rt);
    yogaValues.setProperty(rt, "targetOriginX", values.x);
    yogaValues.setProperty(rt, "targetGlobalOriginX", values.x);
    yogaValues.setProperty(rt, "targetOriginY", values.y);
    yogaValues.setProperty(rt, "targetGlobalOriginY", values.y);
    yogaValues.setProperty(rt, "targetWidth", values.width);
    yogaValues.setProperty(rt, "targetHeight", values.height);
    yogaValues.setProperty(rt, "windowWidth", values.windowWidth);
    yogaValues.setProperty(rt, "windowHeight", values.windowHeight);
    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(rt, tag, LayoutAnimationType::ENTERING, yogaValues);
  });
}

void LayoutAnimationsProxy::startExitingAnimation(const int tag, ShadowViewMutation& mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO)<<"start exiting animation for tag "<<tag<<std::endl;
#endif
  auto finalView = std::make_shared<ShadowView>(mutation.oldChildShadowView);
  auto current = std::make_shared<ShadowView>(mutation.oldChildShadowView);
  LayoutAnimation la{
      finalView,
      current,
      mutation.oldChildShadowView,
      mutation.parentShadowView,
  };
  layoutAnimations_.insert_or_assign(mutation.oldChildShadowView.tag, la);

  Snapshot values(mutation.oldChildShadowView, surfaceManager.getWindow(mutation.oldChildShadowView.surfaceId));

  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [values, this, tag]() {
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    jsi::Object yogaValues(rt);
    yogaValues.setProperty(rt, "currentOriginX", values.x);
    yogaValues.setProperty(rt, "currentGlobalOriginX", values.x);
    yogaValues.setProperty(rt, "currentOriginY", values.y);
    yogaValues.setProperty(rt, "currentGlobalOriginY", values.y);
    yogaValues.setProperty(rt, "currentWidth", values.width);
    yogaValues.setProperty(rt, "currentHeight", values.height);
    yogaValues.setProperty(rt, "windowWidth", values.windowWidth);
    yogaValues.setProperty(rt, "windowHeight", values.windowHeight);
    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(rt, tag, LayoutAnimationType::EXITING, yogaValues);
    layoutAnimationsManager_->clearLayoutAnimationConfig(tag);
  });
}

void LayoutAnimationsProxy::startLayoutAnimation(const int tag, ShadowViewMutation& mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO)<<"start layout animation for tag "<<tag<<std::endl;
#endif
  auto &oldChild = mutation.oldChildShadowView;
  auto surfaceId = mutation.newChildShadowView.surfaceId;
  if (layoutAnimations_.contains(tag)) {
    oldChild = *layoutAnimations_.at(tag).current;
  }
  auto finalView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  auto current = std::make_shared<ShadowView>(oldChild);
  LayoutAnimation la{finalView, current, oldChild, mutation.parentShadowView};
  layoutAnimations_.insert_or_assign(tag, la);

  Snapshot currentValues(oldChild, surfaceManager.getWindow(surfaceId));
  Snapshot targetValues(mutation.newChildShadowView, surfaceManager.getWindow(surfaceId));

  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [currentValues, targetValues, this, tag]() {
        jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
        jsi::Object yogaValues(rt);
        yogaValues.setProperty(rt, "currentOriginX", currentValues.x);
        yogaValues.setProperty(rt, "currentGlobalOriginX", currentValues.x);
        yogaValues.setProperty(rt, "currentOriginY", currentValues.y);
        yogaValues.setProperty(rt, "currentGlobalOriginY", currentValues.y);
        yogaValues.setProperty(rt, "currentWidth", currentValues.width);
        yogaValues.setProperty(rt, "currentHeight", currentValues.height);
        yogaValues.setProperty(rt, "targetOriginX", targetValues.x);
        yogaValues.setProperty(rt, "targetGlobalOriginX", targetValues.x);
        yogaValues.setProperty(rt, "targetOriginY", targetValues.y);
        yogaValues.setProperty(rt, "targetGlobalOriginY", targetValues.y);
        yogaValues.setProperty(rt, "targetWidth", targetValues.width);
        yogaValues.setProperty(rt, "targetHeight", targetValues.height);
        yogaValues.setProperty(rt, "windowWidth", targetValues.windowWidth);
        yogaValues.setProperty(rt, "windowHeight", targetValues.windowHeight);
        nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(rt, tag, LayoutAnimationType::LAYOUT, yogaValues);
      });
}

void LayoutAnimationsProxy::cancelAnimation(const int tag) const{
  bannedTags.insert(tag);
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
    [this, tag]() {
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    nativeReanimatedModule_->layoutAnimationsManager().cancelLayoutAnimation(rt, tag);
  });
}

void LayoutAnimationsProxy::transferConfigFromNativeTag(const std::string nativeIdString, const int tag) const{
  if (nativeIdString.empty()){
    return;
  }
  try {
    auto nativeId = stoi(nativeIdString);
    layoutAnimationsManager_->transferConfigFromNativeTag(nativeId, tag);
    std::shared_ptr<Shareable> config = nullptr;
  } catch (std::invalid_argument) {}
}

void Node::handleMutation(ShadowViewMutation mutation){
  if (tag != mutation.parentShadowView.tag){
    return;
  }
  
  int delta = mutation.type == ShadowViewMutation::Insert ? 1 : -1;
  for (int i=children.size()-1; i>=0; i--){
    if (children[i]->mutation.index < mutation.index){
      return;
    }
    children[i]->mutation.index += delta;
  }
}

void Node::removeChild(std::shared_ptr<MutationNode> child){
  for (int i=children.size()-1; i>=0; i--){
    if (children[i]->tag == child->tag){
      children.erase(children.begin()+i);
      return;
    }
    children[i]->mutation.index--;
  }
}

void Node::addChild(std::shared_ptr<MutationNode> child){
  bool done = false;
  for (auto it = children.begin(); it != children.end(); it++){
    if ((*it)->mutation.index >child->mutation.index){
      children.insert(it, child);
      done = true;
      break;
    }
  }
  if (!done){
    children.push_back(child);
  }
}

void Node::insertChildren(std::vector<std::shared_ptr<MutationNode>> &newChildren){
  std::vector<std::shared_ptr<MutationNode>> mergedChildren;
  auto it1 = children.begin(), it2=newChildren.begin();
  while(it1 != children.end() && it2 != newChildren.end()){
    if ((*it1)->mutation.index < (*it2)->mutation.index){
      mergedChildren.push_back(*it1);
      it1++;
    } else {
      mergedChildren.push_back(*it2);
      it2++;
    }
  }
  while (it1 != children.end()){
    mergedChildren.push_back(*it1);
    it1++;
  }
  while (it2 != newChildren.end()){
    mergedChildren.push_back(*it2);
    it2++;
  }
  std::swap(children, mergedChildren);
}

} // namespace reanimated
