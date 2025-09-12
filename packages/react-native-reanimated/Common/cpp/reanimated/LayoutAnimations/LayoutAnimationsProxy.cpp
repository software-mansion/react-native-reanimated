#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>
#ifndef ANDROID
#include <react/renderer/components/rnscreens/Props.h>
#endif
#include <react/renderer/animations/utils.h>
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <glog/logging.h>
#include <react/renderer/core/ConcreteState.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#ifdef ANDROID
#undef LOG
#define LOG SYSLOG
#endif

#include <set>
#include <utility>

using ScrollState = ConcreteState<ScrollViewState>;

namespace reanimated {

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(SurfaceId surfaceId, MountingTransaction::Number transactionNumber, const TransactionTelemetry &telemetry, ShadowViewMutationList mutations) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << std::endl;
  LOG(INFO) << "pullTransaction " << std::this_thread::get_id() << " "
            << surfaceId << std::endl;
#endif
  LOG(INFO) << "pullTransaction";
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  ReanimatedSystraceSection d("pullTransaction");
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  ShadowViewMutationList filteredMutations;
  std::vector<std::shared_ptr<MutationNode>> roots;
  std::unordered_map<Tag, ShadowView> movedViews;
  bool isInTransition = transitionState_;
  
  if (isInTransition){
    updateLightTree(mutations, filteredMutations);
    handleProgressTransition(filteredMutations, mutations, propsParserContext, surfaceId);
  } else if (!synchronized_){
    auto actualTop = topScreen[surfaceId];
    updateLightTree(mutations, filteredMutations);
    auto reactTop = findTopScreen(lightNodes_[surfaceId]);
    if (reactTop->current.tag == actualTop->current.tag){
      synchronized_ = true;
    }
  } else {
    auto root = lightNodes_[surfaceId];
    auto beforeTopScreen = topScreen[surfaceId];
    if (beforeTopScreen){
      findSharedElementsOnScreen(beforeTopScreen, 0);
    }
    
    updateLightTree(mutations, filteredMutations);
    
    root = lightNodes_[surfaceId];
    auto afterTopScreen = findTopScreen(root);
    topScreen[surfaceId] = afterTopScreen;
    if (afterTopScreen){
      findSharedElementsOnScreen(afterTopScreen, 1);
    }
    bool shouldTransitionStart = beforeTopScreen && afterTopScreen && beforeTopScreen->current.tag != afterTopScreen->current.tag;
    
    if (shouldTransitionStart){
      std::vector<ShadowViewMutation> temp;
      hideTransitioningViews(0, temp, propsParserContext);
      temp.insert(temp.end(), filteredMutations.begin(), filteredMutations.end());
      hideTransitioningViews(1, temp, propsParserContext);
      std::swap(filteredMutations, temp);
    }
    
    handleSharedTransitionsStart(afterTopScreen, beforeTopScreen, filteredMutations, mutations, propsParserContext, surfaceId);
    
    for (auto& node: entering_){
      startEnteringAnimation(node->current.tag, ShadowViewMutation::InsertMutation(node->parent.lock()->current.tag, node->current, -1));
    }
    for (auto& node: layout_){
      startLayoutAnimation(node->current.tag, ShadowViewMutation::UpdateMutation(node->previous, node->current, node->parent.lock()->current.tag));
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

Tag LayoutAnimationsProxy::findVisible(std::shared_ptr<LightNode> node, int& count) const{
//  auto group = sharedTransitionManager_->groups_[sharedTransitionManager_->tagToName_[node->current.tag]];
//  while (node != nullptr){
//    if (!strcmp(node->current.componentName, "RNSScreenStack")){
//
//    }
//    node = node->parent.lock();
//  }
  int c = count;
  if (!strcmp(node->current.componentName, "RNSScreen")){
    LOG(INFO) << c <<" begin screen tag: " << node->current.tag<<std::endl;
    count++;
  }
  for (auto& child: node->children){
    findVisible(child, count);
  }
  if (!strcmp(node->current.componentName, "RNSScreen")){
    LOG(INFO) << c <<" end screen" <<std::endl;
  }
  return -1;
}

LightNode::Unshared LayoutAnimationsProxy::findTopScreen(LightNode::Unshared node) const{
  LightNode::Unshared result = nullptr;
  if (!node->current.componentName){
    return result;
  }

  if (!(strcmp(node->current.componentName, "RNSScreen"))){
      bool isActive = false;
#ifdef ANDROID
      // TODO: this looks like a RNSScreens bug - sometimes there is no active screen at a deeper level, when going back
//      float f = node->current.props->rawProps.getDefault("activityState", 0).asDouble();
//      isActive = f == 2.0f;
        isActive = true;
#else
      isActive = std::static_pointer_cast<const RNSScreenProps>(node->current.props)->activityState == 2.0f;
#endif
      if (isActive) {
          result = node;
      }
  }
  
  for (auto it = node->children.rbegin(); it != node->children.rend(); it++){
    auto t = findTopScreen(*it);
    if (t){
      return t;
    }
  }
  
  return result;
}

void LayoutAnimationsProxy::findSharedElementsOnScreen(LightNode::Unshared node, int index) const{
  if (sharedTransitionManager_->tagToName_.contains(node->current.tag)){
    ShadowView copy = node->current;
    copy.layoutMetrics = getAbsoluteMetrics(node);
    auto sharedTag = sharedTransitionManager_->tagToName_[node->current.tag];
    auto& transition = transitionMap_[sharedTag];
    transition.snapshot[index] = copy;
    transition.parentTag[index] = node->parent.lock()->current.tag;
    if (transition.parentTag[0] && transition.parentTag[1]){
      transitions_.push_back({sharedTag, transition});
    } else if (transition.parentTag[1]){
      // TODO: this is too eager
      tagsToRestore_.push_back(transition.snapshot[1].tag);
    }
  }
  for (auto& child: node->children){
    findSharedElementsOnScreen(child, index);
  }
}

LayoutMetrics LayoutAnimationsProxy::getAbsoluteMetrics(LightNode::Unshared node) const{
  auto result = node->current.layoutMetrics;
  auto parent = node->parent.lock();
  while (parent){
    if (!strcmp(parent->current.componentName, "ScrollView")){
      auto state = std::static_pointer_cast<const ScrollState>(parent->current.state);
      auto data = state->getData();
//      LOG(INFO) << node->current.tag << " content offset:" << data.contentOffset.x << " " << data.contentOffset.y;
      result.frame.origin -= data.contentOffset;
    }
    if (!strcmp(parent->current.componentName, "RNSScreen") && parent->children.size()>=2){
      auto p =parent->parent.lock();
      if (p){
        result.frame.origin.y += (p->current.layoutMetrics.frame.size.height - parent->current.layoutMetrics.frame.size.height);
      }
    }
    result.frame.origin.x += parent->current.layoutMetrics.frame.origin.x;
    result.frame.origin.y += parent->current.layoutMetrics.frame.origin.y;
    parent = parent->parent.lock();
  }
  return result;
}

void LayoutAnimationsProxy::handleProgressTransition(ShadowViewMutationList &filteredMutations, const ShadowViewMutationList &mutations, const PropsParserContext &propsParserContext, SurfaceId surfaceId) const {
  LOG(INFO) << "Transition state: " << transitionState_;
  if (!transitionUpdated_){
    return;
  }
  transitionUpdated_ = false;
  
  if (mutations.size() == 0 && transitionState_){
    if (transitionState_ == START){
      auto root = lightNodes_[surfaceId];
      auto beforeTopScreen = topScreen[surfaceId];
      auto afterTopScreen = lightNodes_[transitionTag_];
      if (beforeTopScreen && afterTopScreen){
        LOG(INFO) << "start progress transition: " << beforeTopScreen->current.tag << " -> " << afterTopScreen->current.tag;
        
        findSharedElementsOnScreen(beforeTopScreen, 0);
        findSharedElementsOnScreen(afterTopScreen, 1);
        
        if (beforeTopScreen->current.tag != afterTopScreen->current.tag){
          
          for (auto& [sharedTag, transition]: transitions_){
            const auto& [before, after] = transition.snapshot;
            const auto& [beforeParentTag, afterParentTag] = transition.parentTag;
            
            auto& root = lightNodes_[surfaceId];
            ShadowView s = before;
            s.tag = myTag;
            filteredMutations.push_back(ShadowViewMutation::CreateMutation(s));
            filteredMutations.push_back(ShadowViewMutation::InsertMutation(surfaceId, s, root->children.size()));
            filteredMutations.push_back(ShadowViewMutation::UpdateMutation(after, after, afterParentTag));
            auto p = lightNodes_[before.tag]->parent.lock();
            auto m1 = ShadowViewMutation::InsertMutation(p->current.tag, before, 8);
            filteredMutations.push_back(ShadowViewMutation::UpdateMutation(before, *cloneViewWithoutOpacity(m1, propsParserContext), p->current.tag));
            
            
            auto m = ShadowViewMutation::UpdateMutation(after, after, afterParentTag);
            m = ShadowViewMutation::UpdateMutation(after, *cloneViewWithoutOpacity(m, propsParserContext), afterParentTag);
            filteredMutations.push_back(m);
            auto node = std::make_shared<LightNode>();
            node->current = s;
            lightNodes_[myTag] = node;
            
            root->children.push_back(node);
            layoutAnimationsManager_->getConfigsForType(LayoutAnimationType::SHARED_ELEMENT_TRANSITION)[myTag] = layoutAnimationsManager_->getConfigsForType(LayoutAnimationType::SHARED_ELEMENT_TRANSITION)[before.tag];
            ShadowView copy = after;
            copy.tag = myTag;
            auto copy2 = before;
            copy2.tag = myTag;
            startProgressTransition(myTag, copy2, copy, surfaceId);
            restoreMap_[myTag][0] = before.tag;
            restoreMap_[myTag][1] = after.tag;
            sharedTransitionManager_->groups_[sharedTag].fakeTag = myTag;
            activeTransitions_.insert(myTag);
            myTag+=2;
            
          }
        }
      }
    } else if (transitionState_ == ACTIVE) {
      for (auto tag: activeTransitions_){
        auto layoutAnimation = layoutAnimations_[tag];
        auto &updateMap =
        surfaceManager.getUpdateMap(layoutAnimation.finalView->surfaceId);
        auto before = layoutAnimation.startView->layoutMetrics.frame;
        auto after = layoutAnimation.finalView->layoutMetrics.frame;
        auto x = before.origin.x + transitionProgress_*(after.origin.x - before.origin.x);
        auto y = before.origin.y + transitionProgress_*(after.origin.y - before.origin.y);
        auto width = before.size.width + transitionProgress_*(after.size.width - before.size.width);
        auto height = before.size.height + transitionProgress_*(after.size.height - before.size.height);
        
        updateMap.insert_or_assign(tag, UpdateValues{nullptr, {x,y,width,height}});
      }
    }
    
    
    if (transitionState_ == START){
      transitionState_ = ACTIVE;
    } else if (transitionState_ == END || transitionState_ == CANCELLED){
      for (auto tag: activeTransitions_){
        sharedContainersToRemove_.push_back(tag);
        tagsToRestore_.push_back(restoreMap_[tag][1]);
        if (transitionState_ == CANCELLED){
          tagsToRestore_.push_back(restoreMap_[tag][0]);
        }
      }
      if (transitionState_ == END){
        topScreen[surfaceId] = lightNodes_[transitionTag_];
        synchronized_ = false;
      }
      sharedTransitionManager_->groups_.clear();
      activeTransitions_.clear();
      transitionState_ = NONE;
    }
  }
}

void LayoutAnimationsProxy::updateLightTree(const ShadowViewMutationList &mutations, ShadowViewMutationList& filteredMutations) const {
  
  std::unordered_set<Tag> moved, deleted;
  for (auto it = mutations.rbegin(); it != mutations.rend(); it++){
    const auto& mutation = *it;
    switch (mutation.type){
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
        if (deleted.contains(tag)){
          lightNodes_[tag]->intent = TO_DELETE;
        } else if (moved.contains(tag)){
          lightNodes_[tag]-> intent = TO_MOVE;
        }
        break;
      }
      default:{}
    }
  }
  
  for (auto &mutation: mutations){
    maybeUpdateWindowDimensions(mutation);
    switch (mutation.type) {
      case ShadowViewMutation::Update:{
        auto& node = lightNodes_[mutation.newChildShadowView.tag];
        node->previous = mutation.oldChildShadowView;
        node->current = mutation.newChildShadowView;
        auto tag = mutation.newChildShadowView.tag;
        if (layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)){
          layout_.push_back(node);
        } else {
          filteredMutations.push_back(mutation);
        }
        break;
      }
      case ShadowViewMutation::Create:{
        auto& node = lightNodes_[mutation.newChildShadowView.tag];
        node = std::make_shared<LightNode>();
        node->current = mutation.newChildShadowView;
        filteredMutations.push_back(mutation);
        break;
      }
      case ShadowViewMutation::Delete:{
        //            lightNodes_.erase(mutation.oldChildShadowView.tag);
        break;
      }
      case ShadowViewMutation::Insert:{
        transferConfigFromNativeID(
                                   mutation.newChildShadowView.props->nativeId,
                                   mutation.newChildShadowView.tag);
        auto& node = lightNodes_[mutation.newChildShadowView.tag];
        auto& parent = lightNodes_[mutation.parentTag];
        parent->children.insert(parent->children.begin()+mutation.index, node);
        node->parent = parent;
        const auto tag = mutation.newChildShadowView.tag;
        if (node->intent == TO_MOVE && layoutAnimationsManager_->hasLayoutAnimation(tag, LAYOUT)){
          // TODO: figure out if that's true
          // we are not starting the animation here because any update will come from the UPDATE mutation
//          layout_.push_back(node);
          filteredMutations.push_back(mutation);
//          node->previous = node->current;
//          node->current = mutation.newChildShadowView;
        } else if (layoutAnimationsManager_->hasLayoutAnimation(tag, ENTERING)){
          entering_.push_back(node);
          filteredMutations.push_back(mutation);
        } else {
          filteredMutations.push_back(mutation);
        }
        break;
      }
      case ShadowViewMutation::Remove:{
        auto& node = lightNodes_[mutation.oldChildShadowView.tag];
        auto& parent = lightNodes_[mutation.parentTag];
        
        if (node->intent == TO_DELETE && parent->intent != TO_DELETE){
          exiting_.push_back(node);
          LOG(INFO) << "remove3 " << node->current.tag;
          if (parent->children[mutation.index]->current.tag == mutation.oldChildShadowView.tag){
            filteredMutations.push_back(mutation);
          } else {
            throw "cos jest nie tak z indexami";
          }
          parent->children.erase(parent->children.begin()+mutation.index);
        } else if (node->intent != TO_DELETE){
          LOG(INFO) << "remove4 " << node->current.tag;
          if (parent->children[mutation.index]->current.tag == mutation.oldChildShadowView.tag){
            filteredMutations.push_back(mutation);
          } else {
            throw "cos jest nie tak z indexami";
          }
          parent->children.erase(parent->children.begin()+mutation.index);
        }
        break;
      }
      default:
        break;
    }
  }
}

void printTree(LightNode::Unshared &node, int level) {
    if (!(strcmp(node->current.componentName, "RNSScreen"))) {
//        bool isActive = false;
#ifdef ANDROID
        float f = node->current.props->rawProps.getDefault("activityState", 0).asDouble();
//        isActive = f == 2.0f;
#else
      float f =  std::static_pointer_cast<const RNSScreenProps>(node->current.props)->activityState;
#endif
        LOG(INFO) << "screen start (activityState: " << f << ") " << node->current.tag << " " << level;
    } else {
//        LOG(INFO) << node->current.componentName << " " << node->current.tag << " " << level;
    }
    for (auto& child: node->children){
        printTree(child, level + 1);
    }
    if (!(strcmp(node->current.componentName, "RNSScreen"))) {
        LOG(INFO) << "screen end" << " " << node->current.tag;
    }
}

void LayoutAnimationsProxy::handleSharedTransitionsStart(const LightNode::Unshared &afterTopScreen, const LightNode::Unshared &beforeTopScreen, ShadowViewMutationList &filteredMutations, const ShadowViewMutationList &mutations, const PropsParserContext &propsParserContext, SurfaceId surfaceId) const {
  {
    ReanimatedSystraceSection s1("moj narzut 2");
    
    if (beforeTopScreen && afterTopScreen && beforeTopScreen->current.tag != afterTopScreen->current.tag){
      LOG(INFO) << "different tags";
      LOG(INFO) << "start transition: " << beforeTopScreen->current.tag << " -> " << afterTopScreen->current.tag;
      
      for (auto& [sharedTag, transition]: transitions_){
        LOG(INFO) << "sharedTag: " << sharedTag;
        const auto& [before, after] = transition.snapshot;
        const auto& [beforeParentTag, afterParentTag] = transition.parentTag;
        
        auto fakeTag = sharedTransitionManager_->groups_[sharedTag].fakeTag;
        auto shouldCreateContainer = (fakeTag == -1 || !layoutAnimations_.contains(fakeTag));
        if (shouldCreateContainer){
          auto& root = lightNodes_[surfaceId];
          ShadowView s = before;
          s.tag = myTag;
          filteredMutations.push_back(ShadowViewMutation::CreateMutation(s));
          filteredMutations.push_back(ShadowViewMutation::InsertMutation(surfaceId, s, root->children.size()));
          filteredMutations.push_back(ShadowViewMutation::UpdateMutation(after, after, afterParentTag));
          auto m = ShadowViewMutation::UpdateMutation(after, after, afterParentTag);
          m = ShadowViewMutation::UpdateMutation(after, *cloneViewWithoutOpacity(m, propsParserContext), afterParentTag);
          filteredMutations.push_back(m);
          auto node = std::make_shared<LightNode>();
          node->current = s;
          lightNodes_[myTag] = node;
          root->children.push_back(node);
          fakeTag = myTag;
        }
        layoutAnimationsManager_->getConfigsForType(LayoutAnimationType::SHARED_ELEMENT_TRANSITION)[fakeTag] = layoutAnimationsManager_->getConfigsForType(LayoutAnimationType::SHARED_ELEMENT_TRANSITION)[before.tag];
        ShadowView copy = after;
        copy.tag = fakeTag;
        auto copy2 = before;
        copy2.tag = fakeTag;
        startSharedTransition(fakeTag, copy2, copy, surfaceId);
        restoreMap_[fakeTag][1] = after.tag;
        if (shouldCreateContainer){
          sharedTransitionManager_->groups_[sharedTag].fakeTag = myTag;
          myTag+=2;
        }
      }
    } else if (mutations.size() && beforeTopScreen && afterTopScreen && beforeTopScreen->current.tag == afterTopScreen->current.tag){
      LOG(INFO) << "same tag";
      for (auto& [sharedTag, transition]: transitions_){
        const auto& [_, after] = transition.snapshot;
        
        auto copy = after;
        auto fakeTag = sharedTransitionManager_->groups_[sharedTag].fakeTag;
        copy.tag = fakeTag;
        if (!layoutAnimations_.contains(fakeTag)){
          continue;
        }
        auto& la = layoutAnimations_[fakeTag];
        if (la.finalView->layoutMetrics != copy.layoutMetrics){
          startSharedTransition(fakeTag, copy, copy, surfaceId);
        }
      }
    }
  }
}

void LayoutAnimationsProxy::cleanupSharedTransitions(ShadowViewMutationList &filteredMutations, const PropsParserContext &propsParserContext, SurfaceId surfaceId) const {
  for (auto& tag: tagsToRestore_){
    auto& node = lightNodes_[tag];
    if (node){
      auto view = node->current;
      auto parentTag = node->parent.lock()->current.tag;
      auto m = ShadowViewMutation::UpdateMutation(view, view, parentTag);
      m = ShadowViewMutation::UpdateMutation(*cloneViewWithoutOpacity(m, propsParserContext), *cloneViewWithOpacity(m, propsParserContext), parentTag);
      filteredMutations.push_back(m);
    }
  }
  tagsToRestore_.clear();
  
  for (auto& tag: sharedContainersToRemove_){
    auto root = lightNodes_[surfaceId];
    for (int i=0; i< root->children.size(); i++){
      auto& child = root->children[i];
      if (child->current.tag == tag){
        filteredMutations.push_back(ShadowViewMutation::RemoveMutation(surfaceId, child->current, i));
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(child->current));
        LOG(INFO) << "delete container " << tag;
        root->children.erase(root->children.begin()+i);
      }
    }
  }
  sharedContainersToRemove_.clear();
}

void LayoutAnimationsProxy::hideTransitioningViews(int index, ShadowViewMutationList &filteredMutations, const PropsParserContext &propsParserContext) const {
  for (auto& [sharedTag, transition]: transitions_){
    const auto& shadowView = transition.snapshot[index];
    const auto& parentTag = transition.parentTag[index];
    auto m = ShadowViewMutation::UpdateMutation(shadowView, shadowView, parentTag);
    m = ShadowViewMutation::UpdateMutation(shadowView, *cloneViewWithoutOpacity(m, propsParserContext), parentTag);
    filteredMutations.push_back(m);
  }
}


std::optional<SurfaceId> LayoutAnimationsProxy::progressLayoutAnimation(
    int tag,
    const jsi::Object &newStyle) {
//#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "progress layout animation for tag " << tag << std::endl;
//#endif
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
      layoutAnimation.finalView->surfaceId, *contextContainer_};
#ifdef RN_SERIALIZABLE_STATE
  rawProps = std::make_shared<RawProps>(folly::dynamic::merge(
      layoutAnimation.finalView->props->rawProps, (folly::dynamic)*rawProps));
#endif
  auto newProps =
      getComponentDescriptorForShadowView(*layoutAnimation.finalView)
          .cloneProps(
              propsParserContext,
              layoutAnimation.finalView->props,
              std::move(*rawProps));
  auto &updateMap =
      surfaceManager.getUpdateMap(layoutAnimation.finalView->surfaceId);
  updateMap.insert_or_assign(
      tag, UpdateValues{newProps, Frame(uiRuntime_, newStyle)});

  return layoutAnimation.finalView->surfaceId;
}

std::optional<SurfaceId> LayoutAnimationsProxy::endLayoutAnimation(
    int tag,
    bool shouldRemove) {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "end layout animation for " << tag << " - should remove "
            << shouldRemove << std::endl;
#endif
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
  auto surfaceId = layoutAnimation.finalView->surfaceId;
  auto &updateMap = surfaceManager.getUpdateMap(surfaceId);
  layoutAnimations_.erase(tag);
  updateMap.erase(tag);
  
  if (tag >= 10000){
    // TODO fix
    auto sharedTag = sharedTransitionManager_->tagToName_[tag];
    sharedTransitionManager_->groups_.erase(sharedTag);
    
    sharedContainersToRemove_.push_back(tag);
    tagsToRestore_.push_back(restoreMap_[tag][1]);
    
  }
  if (!shouldRemove || !lightNodes_.contains(tag)) {
    return surfaceId;
  }

  auto node = lightNodes_[tag];
  node->state = DEAD;
  deadNodes.insert(node);

  return surfaceId;
}

std::optional<SurfaceId> LayoutAnimationsProxy::onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward, bool isSwiping){
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  transitionUpdated_ = true;
//  LOG(INFO) << "notifyTransitionProgress ("<< tag <<"): " << progress << ", closing: " << isClosing << ", goingForward: " << isGoingForward << ", isSwiping: " <<isSwiping;
bool isAndroid;
#ifdef ANDROID
isAndroid = true;
#else
isAndroid = false;
#endif
  // TODO: this new approach causes all back transitions to be progress transitions
  if (isSwiping && !isClosing && !isGoingForward && !isAndroid){
    transitionProgress_ = progress;
    if (transitionState_ == NONE && progress < 1){
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

std::optional<SurfaceId> LayoutAnimationsProxy::onGestureCancel(){
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (transitionState_){
    transitionState_ = CANCELLED;
    transitionUpdated_ = true;
    // TODO: unfix
    return 1;
  }
  return {};
}

void LayoutAnimationsProxy::handleRemovals(
    ShadowViewMutationList &filteredMutations,
    std::vector<std::shared_ptr<LightNode>> &roots) const {
  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  for (auto it = roots.rbegin(); it != roots.rend(); it++) {
    auto &node = *it;
    
    if (startAnimationsRecursively(node, true, true, false, filteredMutations)) {
      auto parent = node->parent.lock();
      // TODO: handle this better
      auto current = node->current;
      if (layoutAnimations_.contains(node->current.tag)){
        current = *layoutAnimations_.at(node->current.tag).currentView;
      }
      filteredMutations.push_back(ShadowViewMutation::InsertMutation(parent->current.tag, current, parent->children.size()));
      parent->children.push_back(node);
      parent->animatedChildrenCount++;
      if (node->state == UNDEFINED){
        node->state = WAITING;
      }
    } else {
        maybeCancelAnimation(node->current.tag);
        filteredMutations.push_back(ShadowViewMutation::DeleteMutation(node->current));
#ifdef LAYOUT_ANIMATIONS_LOGS
        LOG(INFO) << "delete " << node->tag << std::endl;
#endif
    }
  }


  for (auto node : deadNodes) {
    if (node->state != DELETED) {
      auto parent = node->parent.lock();
      int index = 0;
      for (auto it = parent->children.begin(); it != parent->children.end(); it++, index++){
        auto n = *it;
        if (n->current.tag == node->current.tag){
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

    auto newView = std::make_shared<ShadowView>(*layoutAnimation.finalView);
    if (updateValues.newProps){
      newView->props = updateValues.newProps;
    }
    updateLayoutMetrics(newView->layoutMetrics, updateValues.frame);
    
    LOG(INFO) << "(addOngoing) " << tag;

    mutations.push_back(ShadowViewMutation::UpdateMutation(
        *layoutAnimation.currentView, *newView, layoutAnimation.parentTag));
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
  
      int i = node->children.size()-1;
  for (auto it = node->children.rbegin();
       it != node->children.rend();
       it++) {
    auto &subNode = *it;
    if (subNode->state != DELETED) {
      endAnimationsRecursively(subNode, i--, mutations);
    }
  }
  node->children.clear();
      LOG(INFO) << "remove1 " << node->current.tag;
  mutations.push_back(ShadowViewMutation::RemoveMutation(node->parent.lock()->current.tag, node->current, index));
//  nodeForTag_.erase(node->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "delete " << node->tag << std::endl;
#endif
  mutations.push_back(
      ShadowViewMutation::DeleteMutation(node->current));
}

void LayoutAnimationsProxy::maybeDropAncestors(
    std::shared_ptr<LightNode> parent,
    std::shared_ptr<LightNode> child,
    ShadowViewMutationList &cleanupMutations) const {
//  parent->removeChildFromUnflattenedTree(child);
//  if (!parent->isMutationMode()) {
//    return;
//  }
      for (auto it = parent->children.begin(); it != parent->children.end(); it++){
        if ((*it)->current.tag == child->current.tag){
          parent->children.erase(it);
          break;
        }
      }
      if (parent->state == UNDEFINED){
        return;
      }

//  auto node = std::static_pointer_cast<MutationNode>(parent);

  if (parent->children.size() == 0 && parent->state != ANIMATING) {
//    nodeForTag_.erase(parent->current.tag);
    auto pp = parent->parent.lock();
    for (int i=0; i<pp->children.size(); i++){
      if (pp->children[i]->current.tag == parent->current.tag){
        LOG(INFO) << "remove2 " << parent->current.tag << ", "<<parent->state;
        cleanupMutations.push_back(ShadowViewMutation::RemoveMutation(pp->current.tag, parent->current, i));
        maybeCancelAnimation(parent->current.tag);
    #ifdef LAYOUT_ANIMATIONS_LOGS
        LOG(INFO) << "delete " << node->tag << std::endl;
    #endif
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
  if (isRNSScreen(node)) {
    isScreenPop = true;
  }

  shouldAnimate = !isScreenPop &&
      layoutAnimationsManager_->shouldAnimateExiting(node->current.tag, shouldAnimate);

  bool hasExitAnimation = shouldAnimate &&
      layoutAnimationsManager_->hasLayoutAnimation(
          node->current.tag, LayoutAnimationType::EXITING);
  bool hasAnimatedChildren = false;

  shouldRemoveSubviewsWithoutAnimations =
      shouldRemoveSubviewsWithoutAnimations && !hasExitAnimation;
  std::vector<std::shared_ptr<LightNode>> toBeRemoved;

  // iterate from the end, so that children
  // with higher indices appear first in the mutations list
  auto index = node->children.size();
  for (auto it = node->children.rbegin();
       it != node->children.rend();
       it++) {
    index--;
    auto &subNode = *it;
#ifdef LAYOUT_ANIMATIONS_LOGS
    LOG(INFO) << "child " << subNode->tag << " "
              << " " << shouldAnimate << " "
              << shouldRemoveSubviewsWithoutAnimations << std::endl;
#endif
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
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "child " << subNode->tag
                << " start animations returned true " << std::endl;
#endif
      hasAnimatedChildren = true;
    } else if (shouldRemoveSubviewsWithoutAnimations) {
      maybeCancelAnimation(subNode->current.tag);
      LOG(INFO) << "remove " << subNode->current.tag << " from " << node->current.tag << " at " << index;
      mutations.push_back(ShadowViewMutation::RemoveMutation(node->current.tag, subNode->current, index));
      toBeRemoved.push_back(subNode);
      subNode->state = DELETED;
//      nodeForTag_.erase(subNode->tag);
#ifdef LAYOUT_ANIMATIONS_LOGS
      LOG(INFO) << "delete " << subNode->tag << std::endl;
#endif
      mutations.push_back(ShadowViewMutation::DeleteMutation(subNode->current));
    }
    else {
      subNode->state = WAITING;
    }
  }

  for (auto &subNode : toBeRemoved) {
    node->removeChild(subNode);
  }

  bool wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

  if (hasExitAnimation) {
    node->state = ANIMATING;
    startExitingAnimation(node->current.tag, ShadowViewMutation::RemoveMutation(node->parent.lock()->current.tag, node->current, 0));
  } else {
//    layoutAnimationsManager_->clearLayoutAnimationConfig(node->tag);
  }

  return wantAnimateExit;
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  return true;
}

void LayoutAnimationsProxy::createLayoutAnimation(
    const ShadowViewMutation &mutation,
    ShadowView &oldView,
    const SurfaceId &surfaceId,
    const int tag) const {
  int count = 1;
  auto layoutAnimationIt = layoutAnimations_.find(tag);

  if (layoutAnimationIt != layoutAnimations_.end()) {
    auto &layoutAnimation = layoutAnimationIt->second;
    oldView = *layoutAnimation.currentView;
    count = layoutAnimation.count + 1;
  }

  auto finalView = std::make_shared<ShadowView>(
      mutation.type == ShadowViewMutation::Remove
          ? mutation.oldChildShadowView
          : mutation.newChildShadowView);
  auto currentView = std::make_shared<ShadowView>(oldView);
      auto startView =std::make_shared<ShadowView>(oldView);

  layoutAnimations_.insert_or_assign(
      tag,
   LayoutAnimation{finalView, currentView, startView, mutation.parentTag, {}, count});

}

void LayoutAnimationsProxy::startEnteringAnimation(
    const int tag,
    const ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start entering animation for tag " << tag << std::endl;
#endif
  auto finalView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  auto current = std::make_shared<ShadowView>(mutation.newChildShadowView);

  auto &viewProps =
      static_cast<const ViewProps &>(*mutation.newChildShadowView.props);
  auto opacity = viewProps.opacity;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(),
                              finalView,
                              current,
                              mutation,
                              opacity,
                              tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      strongThis->layoutAnimations_.insert_or_assign(
          tag,
          LayoutAnimation{
              finalView,
              current,
            nullptr,
              mutation.parentTag,
              opacity});
      window = strongThis->surfaceManager.getWindow(
          mutation.newChildShadowView.surfaceId);
    }

    Snapshot values(mutation.newChildShadowView, window);
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
    const int tag,
    const ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start exiting animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.oldChildShadowView.surfaceId;

  uiScheduler_->scheduleOnUI(
      [weakThis = weak_from_this(), tag, mutation, surfaceId]() {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }

        auto oldView = mutation.oldChildShadowView;
        Rect window{};
        {
          auto &mutex = strongThis->mutex;
          auto lock = std::unique_lock<std::recursive_mutex>(mutex);
          strongThis->createLayoutAnimation(mutation, oldView, surfaceId, tag);
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
    const int tag,
    const ShadowViewMutation &mutation) const {
#ifdef LAYOUT_ANIMATIONS_LOGS
  LOG(INFO) << "start layout animation for tag " << tag << std::endl;
#endif
  auto surfaceId = mutation.oldChildShadowView.surfaceId;

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(),
                              mutation,
                              surfaceId,
                              tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = mutation.oldChildShadowView;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      strongThis->createLayoutAnimation(mutation, oldView, surfaceId, tag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    Snapshot currentValues(oldView, window);
    Snapshot targetValues(mutation.newChildShadowView, window);

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

void LayoutAnimationsProxy::startSharedTransition(const int tag, const ShadowView &before, const ShadowView &after, SurfaceId surfaceId) const{

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(),
                              before,
                              after,
                              surfaceId,
                              tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = before;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      strongThis->createLayoutAnimation(ShadowViewMutation::InsertMutation(surfaceId, after, 1), oldView, surfaceId, tag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }

    Snapshot currentValues(oldView, window);
    Snapshot targetValues(after, window);

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
    yogaValues.setProperty(uiRuntime, "windowHeight", targetValues.windowHeight);
    strongThis->layoutAnimationsManager_->startLayoutAnimation(uiRuntime, tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION, yogaValues);
  });
}

void LayoutAnimationsProxy::startProgressTransition(const int tag, const ShadowView &before, const ShadowView &after, SurfaceId surfaceId) const{

  uiScheduler_->scheduleOnUI([weakThis = weak_from_this(),
                              before,
                              after,
                              surfaceId,
                              tag]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto oldView = before;
    Rect window{};
    {
      auto &mutex = strongThis->mutex;
      auto lock = std::unique_lock<std::recursive_mutex>(mutex);
      strongThis->createLayoutAnimation(ShadowViewMutation::InsertMutation(surfaceId, after, 1), oldView, surfaceId, tag);
      window = strongThis->surfaceManager.getWindow(surfaceId);
    }
  });
}

void LayoutAnimationsProxy::updateOngoingAnimationTarget(
    const int tag,
    const ShadowViewMutation &mutation) const {
  layoutAnimations_[tag].finalView =
      std::make_shared<ShadowView>(mutation.newChildShadowView);
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
std::shared_ptr<ShadowView> LayoutAnimationsProxy::cloneViewWithoutOpacity(
    facebook::react::ShadowViewMutation &mutation,
    const PropsParserContext &propsParserContext) const {
  auto newView = std::make_shared<ShadowView>(mutation.newChildShadowView);
  folly::dynamic opacity = folly::dynamic::object("opacity", 0);
  auto newProps = getComponentDescriptorForShadowView(*newView).cloneProps(
      propsParserContext, newView->props, RawProps(opacity));
  newView->props = newProps;
  return newView;
}

    std::shared_ptr<ShadowView> LayoutAnimationsProxy::cloneViewWithOpacity(
            facebook::react::ShadowViewMutation &mutation,
            const PropsParserContext &propsParserContext) const {
        auto newView = std::make_shared<ShadowView>(mutation.newChildShadowView);
        folly::dynamic opacity = folly::dynamic::object("opacity", 1);
        auto newProps = getComponentDescriptorForShadowView(*newView).cloneProps(
                propsParserContext, newView->props, RawProps(opacity));
        newView->props = newProps;
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

} // namespace reanimated
