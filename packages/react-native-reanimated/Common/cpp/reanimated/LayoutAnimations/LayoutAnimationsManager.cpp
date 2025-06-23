#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>

#ifndef NDEBUG
#include <utility>
#endif

namespace reanimated {

void LayoutAnimationsManager::configureAnimationBatch(
    const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch) {
  auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
  for (auto layoutAnimationConfig : layoutAnimationsBatch) {
    const auto &[tag, type, config] = layoutAnimationConfig;
    if (type == ENTERING) {
      enteringAnimationsForNativeID_[tag] = config;
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
  return shouldAnimateExitingForTag_.contains(tag)
      ? shouldAnimateExitingForTag_[tag]
      : shouldAnimate;
}

bool LayoutAnimationsManager::hasLayoutAnimation(
    const int tag,
    const LayoutAnimationType type) {
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
  std::shared_ptr<Shareable> config;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(animationsMutex_);
    if (!getConfigsForType(type).contains(tag)) {
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
    default:
      throw std::invalid_argument("[Reanimated] Unknown layout animation type");
  }
}

} // namespace reanimated
