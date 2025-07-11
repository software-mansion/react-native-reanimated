#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated::css {

bool CSSAnimationsRegistry::isEmpty() const {
  // The registry is empty if has no registered animations and no updates
  // stored in the updates registry
  return UpdatesRegistry::isEmpty() && registry_.empty();
}

bool CSSAnimationsRegistry::hasUpdates() const {
  return !runningAnimationIndicesMap_.empty() ||
      !delayedAnimationsManager_.empty() || !animationsToRevertMap_.empty();
}

void CSSAnimationsRegistry::apply(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::optional<std::vector<std::string>> &animationNames,
    const CSSAnimationsMap &newAnimations,
    const CSSAnimationSettingsUpdatesMap &settingsUpdates,
    double timestamp) {
  const auto animationsVector =
      buildAnimationsVector(rt, shadowNode, animationNames, newAnimations);

  const auto viewTag = shadowNode->getTag();
  if (animationsVector.empty()) {
    remove(viewTag);
    return;
  }

  registry_.erase(viewTag);
  registry_.emplace(
      viewTag,
      RegistryEntry{
          std::move(animationsVector),
          buildAnimationToIndexMap(animationsVector)});
  runningAnimationIndicesMap_[viewTag].clear();

  std::vector<size_t> updatedIndices;
  for (const auto &[index, _] : newAnimations) {
    updatedIndices.push_back(index);
  }
  for (const auto &[index, _] : settingsUpdates) {
    updatedIndices.push_back(index);
  }

  updateAnimationSettings(animationsVector, settingsUpdates, timestamp);
  for (size_t i = 0; i < animationsVector.size(); ++i) {
    scheduleOrActivateAnimation(i, animationsVector[i], timestamp);
  }
  updateViewAnimations(viewTag, updatedIndices, timestamp, false);
  applyViewAnimationsStyle(viewTag, timestamp);
}

void CSSAnimationsRegistry::remove(const Tag viewTag) {
  removeViewAnimations(viewTag);
  removeFromUpdatesRegistry(viewTag);
  registry_.erase(viewTag);
}

void CSSAnimationsRegistry::update(const double timestamp) {
  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Update styles in the registry for views which animations were reverted
  handleAnimationsToRevert(timestamp);

  // Iterate over active animations and update them
  for (auto it = runningAnimationIndicesMap_.begin();
       it != runningAnimationIndicesMap_.end();) {
    const auto viewTag = it->first;
    const std::vector<size_t> animationIndices = {
        it->second.begin(), it->second.end()};
    updateViewAnimations(viewTag, animationIndices, timestamp, true);

    if (runningAnimationIndicesMap_[viewTag].empty()) {
      it = runningAnimationIndicesMap_.erase(it);
    } else {
      ++it;
    }
  }
}

CSSAnimationsVector CSSAnimationsRegistry::buildAnimationsVector(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::optional<std::vector<std::string>> &animationNames,
    const std::optional<CSSAnimationsMap> &newAnimations) const {
  const auto registryIt = registry_.find(shadowNode->getTag());

  // If animationNames has no value, that means no animations were added,
  // removed or reordered, so we can return the current animations vector from
  // the registry
  if (!animationNames.has_value()) {
    if (registryIt != registry_.end()) {
      return std::move(registryIt->second.animationsVector);
    }
  }

  CSSAnimationsVector animationsVector;
  const auto &animationNamesVector = animationNames.value();
  const auto animationNamesSize = animationNamesVector.size();
  animationsVector.reserve(animationNamesSize);

  std::unordered_map<std::string, CSSAnimationsVector> oldAnimationsMap;
  CSSAnimationsMap emptyAnimationsMap;
  const auto &newAnimationsMap = newAnimations.value_or(emptyAnimationsMap);

  if (registryIt != registry_.end()) {
    const auto &oldAnimations = registryIt->second.animationsVector;

    // Fill the map while maintaining reverse order (for quick pop from the end)
    for (auto it = oldAnimations.rbegin(); it != oldAnimations.rend(); ++it) {
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
          "[Reanimated] There is no animation with name " + name +
          " available to use at index " + std::to_string(i));
    }

    animationsVector.emplace_back(oldAnimationIt->second.back());
    oldAnimationIt->second.pop_back();

    if (oldAnimationIt->second.empty()) {
      oldAnimationsMap.erase(oldAnimationIt);
    }
  }

  return animationsVector;
}

CSSAnimationsRegistry::AnimationToIndexMap
CSSAnimationsRegistry::buildAnimationToIndexMap(
    const CSSAnimationsVector &animationsVector) const {
  AnimationToIndexMap animationToIndexMap;

  for (size_t i = 0; i < animationsVector.size(); ++i) {
    animationToIndexMap[animationsVector[i]] = i;
  }

  return animationToIndexMap;
}

void CSSAnimationsRegistry::updateAnimationSettings(
    const CSSAnimationsVector &animationsVector,
    const CSSAnimationSettingsUpdatesMap &settingsUpdates,
    const double timestamp) {
  for (size_t i = 0; i < animationsVector.size(); ++i) {
    const auto &animation = animationsVector[i];
    const auto it = settingsUpdates.find(i);
    if (it != settingsUpdates.end()) {
      animation->updateSettings(it->second, timestamp);
    }
  }
}

void CSSAnimationsRegistry::updateViewAnimations(
    const Tag viewTag,
    const std::vector<size_t> &animationIndices,
    const double timestamp,
    const bool addToBatch) {
  folly::dynamic result = folly::dynamic::object;
  std::shared_ptr<const ShadowNode> shadowNode = nullptr;
  bool hasUpdates = false;

  for (const auto animationIndex : animationIndices) {
    const auto &animation = registry_[viewTag].animationsVector[animationIndex];
    if (!shadowNode) {
      shadowNode = animation->getShadowNode();
    }
    if (animation->getState(timestamp) == AnimationProgressState::Pending) {
      animation->run(timestamp);
    }

    bool updatesAddedToBatch = false;
    const auto updates = animation->update(timestamp);
    const auto newState = animation->getState(timestamp);

    if (newState == AnimationProgressState::Finished) {
      // Revert changes applied during animation if there is no forwards fill
      // mode
      if (addToBatch && !animation->hasForwardsFillMode()) {
        //  We also have to manually commit style values
        // reverting the changes applied by the animation.
        hasUpdates =
            addStyleUpdates(result, animation->getResetStyle(), false) ||
            hasUpdates;
        updatesAddedToBatch = true;
        // We want to remove style changes applied by the animation that is
        // finished and has no forwards fill mode. We cannot simply remove
        // properties from the style in the registry as it may be overridden
        // by the next animation. Instead, we are creating the new style
        // object without reverted (finished without forwards fill mode)
        // animations.
        animationsToRevertMap_[viewTag].insert(animationIndex);
      }
    }

    if (addToBatch && !updatesAddedToBatch) {
      hasUpdates = addStyleUpdates(result, updates, true) || hasUpdates;
    }
    if (newState != AnimationProgressState::Running) {
      runningAnimationIndicesMap_[viewTag].erase(animationIndex);
    }
  }

  if (hasUpdates) {
    addUpdatesToBatch(shadowNode, result);
  }
}

void CSSAnimationsRegistry::scheduleOrActivateAnimation(
    const size_t animationIndex,
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  // Remove the animation from delayed (if it is already added to
  // delayed animations)
  delayedAnimationsManager_.remove(animation);

  const auto startTimestamp = animation->getStartTimestamp(timestamp);

  if (startTimestamp > timestamp) {
    // If the animation is delayed, schedule it for activation
    // (Only if it isn't paused)
    if (animation->getState(timestamp) != AnimationProgressState::Paused) {
      delayedAnimationsManager_.add(startTimestamp, animation);
    }
  } else {
    const auto viewTag = animation->getShadowNode()->getTag();
    runningAnimationIndicesMap_[viewTag].insert(animationIndex);
  }
}

void CSSAnimationsRegistry::removeViewAnimations(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }

  for (const auto &animation : it->second.animationsVector) {
    delayedAnimationsManager_.remove(animation);
  }
  runningAnimationIndicesMap_.erase(viewTag);
}

void CSSAnimationsRegistry::applyViewAnimationsStyle(
    const Tag viewTag,
    const double timestamp) {
  const auto it = registry_.find(viewTag);
  // Remove the style from the registry if there are no animations for the view
  if (it == registry_.end() || it->second.animationsVector.empty()) {
    removeFromUpdatesRegistry(viewTag);
    return;
  }

  folly::dynamic updatedStyle = folly::dynamic::object;
  std::shared_ptr<const ShadowNode> shadowNode = nullptr;

  for (const auto &animation : it->second.animationsVector) {
    const auto startTimestamp = animation->getStartTimestamp(timestamp);

    folly::dynamic style;
    const auto &currentState = animation->getState(timestamp);
    if (startTimestamp > timestamp && animation->hasBackwardsFillMode()) {
      style = animation->getBackwardsFillStyle();
    } else if (
        currentState == AnimationProgressState::Running ||
        // Animation is paused after start (was running before)
        (currentState == AnimationProgressState::Paused &&
         timestamp >= animation->getStartTimestamp(timestamp)) ||
        // Animation is finished and has fill forwards fill mode
        (currentState == AnimationProgressState::Finished &&
         animation->hasForwardsFillMode())) {
      style = animation->getCurrentInterpolationStyle();
    }

    if (!shadowNode) {
      shadowNode = animation->getShadowNode();
    }
    if (style.isObject()) {
      updatedStyle.update(style);
    }
  }

  setInUpdatesRegistry(shadowNode, updatedStyle);
}

void CSSAnimationsRegistry::activateDelayedAnimations(const double timestamp) {
  while (!delayedAnimationsManager_.empty() &&
         delayedAnimationsManager_.top().timestamp <= timestamp) {
    const auto [_, animation] = delayedAnimationsManager_.pop();
    const auto viewTag = animation->getShadowNode()->getTag();

    // Add only these animations which weren't removed in the meantime
    if (registry_.find(viewTag) == registry_.end()) {
      continue;
    }

    const auto &animationToIndexMap = registry_[viewTag].animationToIndexMap;
    if (animationToIndexMap.find(animation) == animationToIndexMap.end()) {
      continue;
    }

    const auto animationIndex = animationToIndexMap.at(animation);
    runningAnimationIndicesMap_[viewTag].insert(animationIndex);
  }
}

void CSSAnimationsRegistry::handleAnimationsToRevert(const double timestamp) {
  for (const auto &[viewTag, _] : animationsToRevertMap_) {
    applyViewAnimationsStyle(viewTag, timestamp);
  }
  animationsToRevertMap_.clear();
}

bool CSSAnimationsRegistry::addStyleUpdates(
    folly::dynamic &target,
    const folly::dynamic &updates,
    bool shouldOverride) {
  if (!updates.isObject()) {
    return false;
  }

  bool hasUpdates = false;
  for (const auto &[propertyName, propertyValue] : updates.items()) {
    if (shouldOverride || !target.count(propertyName) ||
        target[propertyName].isNull()) {
      target[propertyName] = propertyValue;
      hasUpdates = true;
    }
  }

  return hasUpdates;
}

} // namespace reanimated::css
