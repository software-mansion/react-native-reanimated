#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

void LayoutAnimationsManager::configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  for (const auto &layoutAnimationConfig : layoutAnimationsBatch) {
    const auto &[tag, type, config, sharedTag] = layoutAnimationConfig;

    if (type == LayoutAnimationType::ENTERING) {
      enteringAnimationsForNativeID_[tag] = config;
      continue;
    }
    if (type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID) {
      sharedTransitionsForNativeID_[tag] = config;
      sharedTransitionManager_->nativeIDToName_[tag] = sharedTag;
      continue;
    }
    if (type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION) {
      if (config == nullptr) {
        // TODO (future): if the view was transitioned (e.g. so we are on the second screen)
        // and we remove the config, we should also bring back the view (probably using tagsToRestore_)
        sharedTransitions_.erase(tag);
        sharedTransitionManager_->tagToName_.erase(tag);
      } else {
        sharedTransitions_[tag] = config;
        sharedTransitionManager_->tagToName_[tag] = sharedTag;
      }
      continue;
    }
    if (config == nullptr) {
      getConfigsForType(type).erase(tag);
    } else {
      getConfigsForType(type)[tag] = config;
    }
  }
}

void LayoutAnimationsManager::setShouldAnimateExiting(const int tag, const bool value) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  shouldAnimateExitingForTag_[tag] = value;
}

bool LayoutAnimationsManager::shouldAnimateExiting(const int tag, const bool shouldAnimate) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return shouldAnimateExitingForTag_.contains(tag) ? shouldAnimateExitingForTag_[tag] : shouldAnimate;
}

bool LayoutAnimationsManager::hasLayoutAnimation(const int tag, const LayoutAnimationType type) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  return getConfigsForType(type).contains(tag);
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
  std::shared_ptr<Serializable> config;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!getConfigsForType(type).contains(tag)) {
      return;
    }
    config = getConfigsForType(type)[tag];
  }
  // TODO: cache the following!!
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global().getPropertyAsObject(rt, "global").getProperty(rt, "LayoutAnimationsManager");
  jsi::Function startAnimationForTag =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(rt, "start");
  startAnimationForTag.call(rt, jsi::Value(tag), jsi::Value(static_cast<int>(type)), values, config->toJSValue(rt));
}

void LayoutAnimationsManager::cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const {
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global().getPropertyAsObject(rt, "global").getProperty(rt, "LayoutAnimationsManager");
  jsi::Function cancelLayoutAnimation =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(rt, "stop");
  cancelLayoutAnimation.call(rt, jsi::Value(tag));
}

void LayoutAnimationsManager::transferConfigFromNativeID(const int nativeId, const int tag) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  const auto config = enteringAnimationsForNativeID_[nativeId];
  if (config) {
    enteringAnimations_.insert_or_assign(tag, config);
  }
  enteringAnimationsForNativeID_.erase(nativeId);

  const auto sharedTransitionConfig = sharedTransitionsForNativeID_[nativeId];
  if (sharedTransitionConfig) {
    sharedTransitions_.insert_or_assign(tag, sharedTransitionConfig);
    sharedTransitionManager_->tagToName_[tag] = sharedTransitionManager_->nativeIDToName_[nativeId];
  }
  sharedTransitionsForNativeID_.erase(nativeId);
  sharedTransitionManager_->nativeIDToName_.erase(nativeId);
}

void LayoutAnimationsManager::transferSharedConfig(const Tag from, const Tag to) {
  sharedTransitions_[to] = sharedTransitions_[from];
}

std::shared_ptr<SharedTransitionManager> LayoutAnimationsManager::getSharedTransitionManager() {
  return sharedTransitionManager_;
}

std::unordered_map<int, std::shared_ptr<Serializable>> &LayoutAnimationsManager::getConfigsForType(
    const LayoutAnimationType type) {
  switch (type) {
    case LayoutAnimationType::ENTERING:
      return enteringAnimations_;
    case LayoutAnimationType::EXITING:
      return exitingAnimations_;
    case LayoutAnimationType::LAYOUT:
      return layoutAnimations_;
    case LayoutAnimationType::SHARED_ELEMENT_TRANSITION:
      return sharedTransitions_;
    default:
      throw std::invalid_argument("[Reanimated] Unknown layout animation type");
  }
}

} // namespace reanimated
