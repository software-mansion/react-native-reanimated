#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/Tools/CollectionUtils.h>

#ifndef NDEBUG
#include <utility>
#endif

namespace reanimated {

void LayoutAnimationsManager::configureAnimationBatch(
    const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  for (auto layoutAnimationConfig : layoutAnimationsBatch) {
    const auto &[tag, type, config, sharedTag] = layoutAnimationConfig;
    if (type == ENTERING) {
      enteringAnimationsForNativeID_[tag] = config;
      continue;
    }
    if (type == SHARED_ELEMENT_TRANSITION){
      sharedTransitionsForNativeID_[tag] = config;
      sharedTransitionManager_->nativeIDToName_[tag] = sharedTag;
      continue;
    }
    if (config == nullptr) {
      getConfigsForType(type).erase(tag);
    } else {
      getConfigsForType(type)[tag] = config;
    }
  }
}

void LayoutAnimationsManager::setShouldAnimateExiting(
    const int tag,
    const bool value) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  shouldAnimateExitingForTag_[tag] = value;
}

bool LayoutAnimationsManager::shouldAnimateExiting(
    const int tag,
    const bool shouldAnimate) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return collection::contains(shouldAnimateExitingForTag_, tag)
      ? shouldAnimateExitingForTag_[tag]
      : shouldAnimate;
}

bool LayoutAnimationsManager::hasLayoutAnimation(
    const int tag,
    const LayoutAnimationType type) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return collection::contains(getConfigsForType(type), tag);
}

void LayoutAnimationsManager::clearLayoutAnimationConfig(const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  enteringAnimations_.erase(tag);
  exitingAnimations_.erase(tag);
  layoutAnimations_.erase(tag);
  shouldAnimateExitingForTag_.erase(tag);
}

void LayoutAnimationsManager::startLayoutAnimation(
    jsi::Runtime &rt,
    const int tag,
    const LayoutAnimationType type,
    const jsi::Object &values) {
  std::shared_ptr<Shareable> config;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!collection::contains(getConfigsForType(type), tag)) {
      return;
    }
    config = getConfigsForType(type)[tag];
  }
  // TODO: cache the following!!
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global()
          .getPropertyAsObject(rt, "global")
          .getProperty(rt, "LayoutAnimationsManager");
  jsi::Function startAnimationForTag =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(
          rt, "start");
  startAnimationForTag.call(
      rt,
      jsi::Value(tag),
      jsi::Value(static_cast<int>(type)),
      values,
      config->toJSValue(rt));
}

void LayoutAnimationsManager::cancelLayoutAnimation(
    jsi::Runtime &rt,
    const int tag) const {
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global()
          .getPropertyAsObject(rt, "global")
          .getProperty(rt, "LayoutAnimationsManager");
  jsi::Function cancelLayoutAnimation =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(
          rt, "stop");
  cancelLayoutAnimation.call(rt, jsi::Value(tag));
}

void LayoutAnimationsManager::transferConfigFromNativeID(
    const int nativeId,
    const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  auto config = enteringAnimationsForNativeID_[nativeId];
  if (config) {
    enteringAnimations_.insert_or_assign(tag, config);
  }
  enteringAnimationsForNativeID_.erase(nativeId);
  
  auto setConfig = sharedTransitionsForNativeID_[nativeId];
  if (setConfig){
    sharedTransitions_.insert_or_assign(tag, setConfig);
    sharedTransitionManager_->tagToName_[tag] = sharedTransitionManager_->nativeIDToName_[nativeId];
  }
  sharedTransitionsForNativeID_.erase(nativeId);
}

std::unordered_map<int, std::shared_ptr<Shareable>> &
LayoutAnimationsManager::getConfigsForType(const LayoutAnimationType type) {
  switch (type) {
    case ENTERING:
      return enteringAnimations_;
    case EXITING:
      return exitingAnimations_;
    case LAYOUT:
      return layoutAnimations_;
    case SHARED_ELEMENT_TRANSITION:
      return sharedTransitions_;
    default:
      throw std::invalid_argument("[Reanimated] Unknown layout animation type");
  }
}

//std::optional<ShadowView> SharedTransitionManager::add(const ShadowView& shadowView){
//  auto& group = groups_[tagToName_[shadowView.tag]];
//  std::optional<ShadowView> result;
//  if (!group.stack_.empty()){
//    result = group.tagToView_[group.stack_.top()];
//  }
//  group.stack_.push(shadowView.tag);
//  group.tagToView_[shadowView.tag] = shadowView;
//  
//  return result;
//}
//
//std::optional<std::pair<ShadowView, ShadowView>> SharedTransitionManager::remove(Tag tag){
//  auto& group = groups_[tagToName_[tag]];
//  std::optional<std::pair<ShadowView, ShadowView>> result;
//  if (group.stack_.size()>1){
//    std::pair<ShadowView, ShadowView> p;
//    p.first = group.tagToView_[group.stack_.top()];
//    group.stack_.pop();
//    p.second = group.tagToView_[group.stack_.top()];
//    result = p;
//  } else if (group.stack_.size() == 1){
//    group.stack_.pop();
//  }
//  
//  return result;
//}
//
//int SharedTransitionManager::createTransitionContainer(SharedTag sharedTag){
//  containers_.push_back(sharedTag);
//  return containers_.size();
//}
//
//int SharedTransitionManager::removeTransitionContainer(SharedTag sharedTag){
//  for (int i=0; i<containers_.size(); i++){
//    if (containers_[i] == sharedTag){
//      containers_.erase(containers_.begin() + i);
//      return i;
//    }
//  }
//  
//  return -1;
//}

} // namespace reanimated
