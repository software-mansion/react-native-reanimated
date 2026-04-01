#include <reanimated/CSS/registries/CSSAnimationsRegistry.h>

#include <reanimated/CSS/configs/common.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSAnimationsRegistry::CSSAnimationsRegistry(
    std::shared_ptr<StaticPropsRegistry> staticPropsRegistry,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository,
    std::shared_ptr<CSSKeyframesRegistry> keyframesRegistry,
    std::shared_ptr<ICSSPlatformAnimationManager> platformManager)
    : staticPropsRegistry_(std::move(staticPropsRegistry)),
      viewStylesRepository_(std::move(viewStylesRepository)),
      keyframesRegistry_(std::move(keyframesRegistry)),
      platformManager_(std::move(platformManager)) {}

bool CSSAnimationsRegistry::isEmpty() const {
  // The registry is empty if has no registered animations and no updates
  // stored in the updates registry
  return UpdatesRegistry::isEmpty() && registry_.empty();
}

bool CSSAnimationsRegistry::hasUpdates() const {
  return !runningAnimationIndicesMap_.empty() || !delayedAnimationsManager_.empty() || !animationsToRevertMap_.empty();
}

CSSAnimations CSSAnimationsRegistry::resolveAnimations(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &compoundComponentName,
    const CSSAnimationUpdates &updates,
    double timestamp) {
  CSSAnimationsMap newAnimations;
  if (!updates.newAnimationSettings.empty()) {
    const auto &animationNames = updates.animationNames.value();
    for (const auto &[index, settings] : updates.newAnimationSettings) {
      if (index >= animationNames.size()) {
        throw std::invalid_argument("[Reanimated] new CSS animation index is out of bounds of animationNames");
      }
      newAnimations.emplace(
          index, createAnimation(shadowNode, animationNames[index], compoundComponentName, settings, timestamp));
    }
  }

  auto animations = buildAnimationsVector(shadowNode, updates.animationNames, newAnimations);

  for (const auto &[index, settingsUpdate] : updates.settingsUpdates) {
    if (index < animations.size()) {
      animations[index]->updateSettings(settingsUpdate, timestamp);
    }
  }

  return animations;
}

void CSSAnimationsRegistry::apply(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &compoundComponentName,
    const jsi::Value &animationUpdates,
    double timestamp) {
  const auto updates = parseCSSAnimationUpdates(rt, animationUpdates);
  auto animations = resolveAnimations(rt, shadowNode, compoundComponentName, updates, timestamp);

  const auto viewTag = shadowNode->getTag();
  if (animations.empty()) {
    remove(viewTag);
    return;
  }

  runningAnimationIndicesMap_[viewTag].clear();
  for (size_t i = 0; i < animations.size(); ++i) {
    scheduleOrActivateAnimation(i, animations[i], timestamp);
  }

  registry_[viewTag] = std::move(animations);

  std::vector<size_t> updatedIndices;
  for (const auto &[index, _] : updates.newAnimationSettings) {
    updatedIndices.push_back(index);
  }
  for (const auto &[index, _] : updates.settingsUpdates) {
    updatedIndices.push_back(index);
  }

  updateLoopAnimations(viewTag, updatedIndices, timestamp, false);
  applyLoopAnimationsStyle(viewTag, timestamp);

  const bool listChanged = updates.animationNames.has_value();
  commitPlatformFillValues(viewTag, shadowNode, registry_[viewTag]);
  applyPlatformAnimations(viewTag, listChanged);
}

void CSSAnimationsRegistry::remove(const Tag viewTag) {
  removeViewAnimations(viewTag);
  removeFromUpdatesRegistry(viewTag);

  if (platformManager_) {
    platformManager_->removeAllAnimations(viewTag);
  }

  registry_.erase(viewTag);
}

void CSSAnimationsRegistry::update(const double timestamp) {
  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Update styles in the registry for views which animations were reverted
  handleAnimationsToRevert(timestamp);

  // Iterate over active animations and update them
  for (auto it = runningAnimationIndicesMap_.begin(); it != runningAnimationIndicesMap_.end();) {
    const auto viewTag = it->first;
    const std::vector<size_t> animationIndices = {it->second.begin(), it->second.end()};
    updateLoopAnimations(viewTag, animationIndices, timestamp, true);

    if (runningAnimationIndicesMap_[viewTag].empty()) {
      it = runningAnimationIndicesMap_.erase(it);
    } else {
      ++it;
    }
  }
}

std::shared_ptr<CSSAnimation> CSSAnimationsRegistry::createAnimation(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &animationName,
    const std::string &compoundComponentName,
    const CSSAnimationSettings &settings,
    double timestamp) {
  const auto keyframesConfigOpt = keyframesRegistry_->get(animationName, compoundComponentName);

  if (!keyframesConfigOpt) {
    throw std::runtime_error(
        "[Reanimated] No keyframes with name `" + animationName + "` were registered for component `" +
        splitCompoundComponentName(compoundComponentName).second + "` (" + shadowNode->getComponentName() +
        std::string(")"));
  }

  return std::make_shared<CSSAnimation>(animationName, shadowNode, keyframesConfigOpt->get(), settings, timestamp);
}

CSSAnimations CSSAnimationsRegistry::buildAnimationsVector(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::optional<std::vector<std::string>> &animationNames,
    const std::optional<CSSAnimationsMap> &newAnimations) const {
  const auto registryIt = registry_.find(shadowNode->getTag());

  // If animationNames has no value, that means no animations were added,
  // removed or reordered, so we can return the current animations vector from
  // the registry
  if (!animationNames.has_value()) {
    if (registryIt != registry_.end()) {
      return registryIt->second;
    }
  }

  CSSAnimations animationsVector;
  const auto &animationNamesVector = animationNames.value();
  const auto animationNamesSize = animationNamesVector.size();
  animationsVector.reserve(animationNamesSize);

  std::unordered_map<std::string, CSSAnimations> oldAnimationsMap;
  CSSAnimationsMap emptyAnimationsMap;
  const auto &newAnimationsMap = newAnimations.value_or(emptyAnimationsMap);

  if (registryIt != registry_.end()) {
    // Fill the map while maintaining reverse order (for quick pop from the end)
    for (auto it = registryIt->second.rbegin(); it != registryIt->second.rend(); ++it) {
      oldAnimationsMap[(*it)->getName()].emplace_back(*it);
    }
  }

  for (size_t i = 0; i < animationNamesSize; ++i) {
    const auto &newAnimationIt = newAnimationsMap.find(i);
    if (newAnimationIt != newAnimationsMap.end()) {
      animationsVector.emplace_back(newAnimationIt->second);
      continue;
    }

    const auto &name = animationNamesVector[i];
    const auto &oldAnimationIt = oldAnimationsMap.find(name);

    if (oldAnimationIt == oldAnimationsMap.end()) {
      throw std::runtime_error(
          "[Reanimated] There is no animation with name " + name + " available to use at index " + std::to_string(i));
    }

    animationsVector.emplace_back(oldAnimationIt->second.back());
    oldAnimationIt->second.pop_back();

    if (oldAnimationIt->second.empty()) {
      oldAnimationsMap.erase(oldAnimationIt);
    }
  }

  return animationsVector;
}

void CSSAnimationsRegistry::scheduleOrActivateAnimation(
    const size_t animationIndex,
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  // Remove the animation from delayed (if it is already added to
  // delayed animations)
  delayedAnimationsManager_.remove(animation);

  const auto delay = animation->getSettings().delay;

  if (delay > 0) {
    // If the animation is delayed, schedule it for activation
    // (Only if it isn't paused)
    if (!animation->isPaused()) {
      delayedAnimationsManager_.add(timestamp + delay, animation);
    }
  } else if (animation->hasLoopAnimation()) {
    runningAnimationIndicesMap_[animation->getShadowNode()->getTag()].insert(animationIndex);
  }
}

void CSSAnimationsRegistry::removeViewAnimations(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }

  for (const auto &animation : it->second) {
    delayedAnimationsManager_.remove(animation);
  }
  runningAnimationIndicesMap_.erase(viewTag);
}

void CSSAnimationsRegistry::updateLoopAnimations(
    const Tag viewTag,
    const std::vector<size_t> &animationIndices,
    const double timestamp,
    const bool addToBatch) {
  folly::dynamic result = folly::dynamic::object;
  std::shared_ptr<const ShadowNode> shadowNode = nullptr;
  bool hasUpdates = false;

  const auto &animations = registry_[viewTag];

  for (const auto animationIndex : animationIndices) {
    const auto &anim = animations[animationIndex];
    const auto &loopAnim = anim->getLoopAnimation();
    if (!loopAnim) {
      continue;
    }

    if (!shadowNode) {
      shadowNode = anim->getShadowNode();
    }
    if (loopAnim->getState(timestamp) == AnimationProgressState::Pending) {
      loopAnim->run(timestamp);
    }

    const auto updates = loopAnim->update(timestamp);
    const auto newState = loopAnim->getState(timestamp);

    if (newState == AnimationProgressState::Finished) {
      if (addToBatch && !loopAnim->hasForwardsFillMode()) {
        hasUpdates = mergeStyleUpdates(result, loopAnim->getResetStyle(), false) || hasUpdates;
        animationsToRevertMap_[viewTag].insert(animationIndex);
      }
    } else if (addToBatch) {
      hasUpdates = mergeStyleUpdates(result, updates, true) || hasUpdates;
    }

    if (newState != AnimationProgressState::Running) {
      runningAnimationIndicesMap_[viewTag].erase(animationIndex);
    }
  }

  if (hasUpdates && shadowNode) {
    addUpdatesToBatch(shadowNode->getFamilyShared(), result);
  }
}

void CSSAnimationsRegistry::applyLoopAnimationsStyle(const Tag viewTag, const double timestamp) {
  const auto it = registry_.find(viewTag);
  if (it == registry_.end() || it->second.empty()) {
    removeFromUpdatesRegistry(viewTag);
    return;
  }

  folly::dynamic updatedStyle = folly::dynamic::object;
  std::shared_ptr<const ShadowNode> shadowNode = nullptr;

  for (const auto &anim : it->second) {
    const auto &loopAnim = anim->getLoopAnimation();
    if (!loopAnim) {
      continue;
    }

    const auto startTimestamp = loopAnim->getStartTimestamp(timestamp);

    folly::dynamic style;
    const auto currentState = loopAnim->getState(timestamp);
    if (startTimestamp > timestamp && loopAnim->hasBackwardsFillMode()) {
      style = loopAnim->getBackwardsFillStyle();
    } else if (
        currentState == AnimationProgressState::Running ||
        (currentState == AnimationProgressState::Paused && timestamp >= loopAnim->getStartTimestamp(timestamp)) ||
        (currentState == AnimationProgressState::Finished && loopAnim->hasForwardsFillMode())) {
      style = loopAnim->getCurrentInterpolationStyle();
    }

    if (!shadowNode) {
      shadowNode = anim->getShadowNode();
    }
    if (style.isObject()) {
      updatedStyle.update(style);
    }
  }

  if (shadowNode) {
    setInUpdatesRegistry(shadowNode->getFamilyShared(), updatedStyle);
  }
}

void CSSAnimationsRegistry::activateDelayedAnimations(const double timestamp) {
  while (!delayedAnimationsManager_.empty() && delayedAnimationsManager_.top().timestamp <= timestamp) {
    const auto [_, animation] = delayedAnimationsManager_.pop();
    const auto viewTag = animation->getShadowNode()->getTag();

    const auto registryIt = registry_.find(viewTag);
    if (registryIt == registry_.end()) {
      continue;
    }

    if (animation->getPlatformAnimation()) {
      const auto fillMode = animation->getSettings().fillMode;
      const bool hadBackwardsFill = fillMode == AnimationFillMode::Backwards || fillMode == AnimationFillMode::Both;
      const bool hasForwardsFill = fillMode == AnimationFillMode::Forwards || fillMode == AnimationFillMode::Both;

      if (hadBackwardsFill && !hasForwardsFill) {
        revertPlatformValues(viewTag, animation->getShadowNode(), *animation);
      }

      applyPlatformAnimations(viewTag, true);
    }

    if (animation->getLoopAnimation()) {
      const auto &animations = registryIt->second;
      for (size_t i = 0; i < animations.size(); ++i) {
        if (animations[i] == animation) {
          runningAnimationIndicesMap_[viewTag].insert(i);
          break;
        }
      }
    }
  }
}

void CSSAnimationsRegistry::handleAnimationsToRevert(const double timestamp) {
  for (const auto &[viewTag, _] : animationsToRevertMap_) {
    applyLoopAnimationsStyle(viewTag, timestamp);
  }
  animationsToRevertMap_.clear();
}

void CSSAnimationsRegistry::applyPlatformAnimations(const Tag viewTag, const bool force) {
  if (!platformManager_) {
    return;
  }

  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    platformManager_->removeAllAnimations(viewTag);
    return;
  }

  std::vector<std::shared_ptr<CSSPlatformAnimation>> platformAnimations;
  bool hasDirty = force;

  for (const auto &animation : it->second) {
    if (!animation->getPlatformAnimation()) {
      continue;
    }
    if (delayedAnimationsManager_.contains(animation)) {
      continue;
    }
    if (animation->getPlatformAnimation()->isDirty()) {
      hasDirty = true;
    }
    platformAnimations.push_back(animation->getPlatformAnimation());
  }

  if (!hasDirty || platformAnimations.empty()) {
    return;
  }

  platformManager_->applyAnimations(viewTag, platformAnimations, viewStylesRepository_);
}

void CSSAnimationsRegistry::commitPlatformFillValues(
    Tag viewTag,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSAnimations &animations) {
  folly::dynamic fillStyle = folly::dynamic::object;
  bool hasFillValues = false;

  for (const auto &animation : animations) {
    if (!animation->getPlatformAnimation()) {
      continue;
    }

    const auto &settings = animation->getSettings();
    const auto fillMode = settings.fillMode;
    const auto delay = settings.delay;
    const bool hasBackwardsFill = fillMode == AnimationFillMode::Backwards || fillMode == AnimationFillMode::Both;
    const bool hasForwardsFill = fillMode == AnimationFillMode::Forwards || fillMode == AnimationFillMode::Both;

    if (delay > 0 && hasBackwardsFill) {
      const auto firstValues = animation->getPlatformAnimation()->getFirstKeyframeValues();
      if (firstValues.isObject()) {
        fillStyle.update(firstValues);
        hasFillValues = true;
      }
    }

    if (hasForwardsFill) {
      const auto lastValues = animation->getPlatformAnimation()->getLastKeyframeValues();
      if (lastValues.isObject()) {
        fillStyle.update(lastValues);
        hasFillValues = true;
      }
    }
  }

  if (hasFillValues) {
    addUpdatesToBatch(shadowNode->getFamilyShared(), fillStyle);
    setInUpdatesRegistry(shadowNode->getFamilyShared(), fillStyle);
  }
}

void CSSAnimationsRegistry::revertPlatformValues(
    const Tag viewTag,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSAnimation &animation) {
  if (!animation.getPlatformAnimation()) {
    return;
  }

  const auto staticProps = staticPropsRegistry_->get(viewTag);
  if (!staticProps.isObject()) {
    return;
  }

  folly::dynamic revertStyle = folly::dynamic::object;
  const auto &lastValues = animation.getPlatformAnimation()->getLastKeyframeValues();

  for (const auto &[propName, _] : lastValues.items()) {
    const auto propNameStr = propName.asString();
    if (staticProps.count(propNameStr)) {
      revertStyle[propNameStr] = staticProps[propNameStr];
    }
  }

  if (!revertStyle.empty()) {
    addUpdatesToBatch(shadowNode->getFamilyShared(), revertStyle);
  }
}

bool CSSAnimationsRegistry::mergeStyleUpdates(
    folly::dynamic &target,
    const folly::dynamic &updates,
    bool shouldOverride) {
  if (!updates.isObject()) {
    return false;
  }

  bool hasUpdates = false;
  for (const auto &[propertyName, propertyValue] : updates.items()) {
    if (shouldOverride || !target.count(propertyName) || target[propertyName].isNull()) {
      target[propertyName] = propertyValue;
      hasUpdates = true;
    }
  }

  return hasUpdates;
}

} // namespace reanimated::css
