#include <reanimated/CSS/manager/AnimationsManager.h>

namespace reanimated::css {

AnimationsManager::AnimationsManager(
    const std::shared_ptr<CSSAnimationsRegistry> &animationsRegistry,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
    const std::shared_ptr<AnimationsTimeProgressManager> &timeProgressManager)
    : animationsRegistry_(animationsRegistry),
      keyframesRegistry_(keyframesRegistry),
      timeProgressManager_(timeProgressManager) {}

void AnimationsManager::apply(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const CSSAnimationUpdates &updates,
    double timestamp) {
  const auto viewTag = shadowNode->getTag();
  AnimationsVector animationsVector;

  // Build or get animations vector
  if (updates.animationNames.has_value()) {
    animationsVector = buildAnimationsVector(
        rt,
        shadowNode,
        updates.animationNames,
        updates.newAnimationSettings,
        timestamp);
  } else if (animationsRegistry_->has(viewTag)) {
    animationsVector = std::move(animationsRegistry_[viewTag]);
  } else {
    throw std::runtime_error(
        "[Reanimated] Cannot apply animations to view with tag " +
        std::to_string(viewTag) +
        " because there are no animations in the registry and no animations "
        "were provided");
  }

  // Apply settings updates to animations
  for (const auto &[index, settings] : updates.settingsUpdates) {
    if (index >= animationsVector.size()) {
      throw std::runtime_error(
          "[Reanimated] Cannot apply settings update to animation with index " +
          std::to_string(index) + " because it does not exist");
    }
    updateAnimationSettings(animationsVector[index], settings, timestamp);
  }

  // Set animations vector to the registry
  animationsRegistry_->set(viewTag, std::move(animationsVector));
}

void AnimationsManager::remove(const Tag viewTag) {
  if (!animationsRegistry_->has(viewTag)) {
    return;
  }

  const auto &animations = animationsRegistry_[viewTag];
  for (const auto &animation : animations) {
    timeProgressManager_->erase(animation->getProgressProvider());
  }
  animationsRegistry_->remove(viewTag);
}

std::shared_ptr<CSSAnimation> AnimationsManager::createAnimation(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::string &name,
    const CSSAnimationSettings &settings,
    const double timestamp) const {
  const auto &keyframesConfig = keyframesRegistry_->get(name);

  const auto progressProvider = createProgressProvider(
      settings, keyframesConfig.keyframeEasingFunctions, timestamp);

  return std::make_shared<CSSAnimation>(
      name,
      shadowNode,
      settings.fillMode,
      keyframesConfig.styleInterpolator,
      progressProvider);
}

std::shared_ptr<AnimationProgressProviderBase>
AnimationsManager::createProgressProvider(
    const CSSAnimationSettings &settings,
    const std::shared_ptr<KeyframeEasingFunctions> &keyframeEasingFunctions,
    const double timestamp) const {
  // TODO: Add different progress provider types support (like scroll-based)
  const auto progressProvider = std::make_shared<AnimationTimeProgressProvider>(
      timestamp,
      settings.duration,
      settings.delay,
      settings.iterationCount,
      settings.direction,
      settings.easingFunction,
      keyframeEasingFunctions);

  timeProgressManager_->run(progressProvider, timestamp);

  return progressProvider;
}

void AnimationsManager::updateAnimationSettings(
    std::shared_ptr<CSSAnimation> &animation,
    const PartialCSSAnimationSettings &settings,
    const double timestamp) const {
  // TODO: Change this once we have more progress provider types
  timeProgressManager_->updateAndRun(
      animation->getProgressProvider(), settings, timestamp);
}

AnimationsVector AnimationsManager::buildAnimationsVector(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::optional<std::vector<std::string>> &animationNames,
    const CSSAnimationSettingsMap &newAnimationSettings,
    double timestamp) const {
  const auto viewTag = shadowNode->getTag();
  AnimationsVector result;

  const auto &oldAnimationsMap = getViewAnimationsMap(viewTag);
  const auto &animationNamesVector = animationNames.value();
  const auto animationNamesSize = animationNamesVector.size();
  result.reserve(animationNamesSize);

  for (size_t index = 0; index < animationNamesSize; ++index) {
    const auto &settingsIt = newAnimationSettings.find(index);
    if (settingsIt != newAnimationSettings.end()) {
      result.emplace_back(createAnimation(
          rt,
          shadowNode,
          animationNamesVector[index],
          settingsIt->second,
          timestamp));
      continue;
    }

    const auto &name = animationNamesVector[index];
    const auto &oldAnimationIt = oldAnimationsMap.find(name);

    if (oldAnimationIt == oldAnimationsMap.end()) {
      throw std::runtime_error(
          "[Reanimated] There is no animation with name " + name +
          " available to use at index " + std::to_string(i));
    }

    const auto &matchingAnimations = oldAnimationIt->second;
    result.emplace_back(matchingAnimations.back());
    matchingAnimations.pop_back();

    if (matchingAnimations.empty()) {
      oldAnimationsMap.erase(oldAnimationIt);
    }
  }

  return result;
}

AnimationVectorsMap &AnimationsManager::getViewAnimationsMap(
    const Tag viewTag) const {
  AnimationVectorsMap result;

  if (!animationsRegistry_->has(viewTag)) {
    return result;
  }

  const auto &animations = animationsRegistry_[viewTag];
  // Fill the map while maintaining reverse order (for quick pop from the end)
  for (auto it = animations.rbegin(); it != animations.rend(); ++it) {
    const auto &animation = it->second;
    result[animation->getName()].emplace_back(animation);
  }

  return result;
}

} // namespace reanimated::css
