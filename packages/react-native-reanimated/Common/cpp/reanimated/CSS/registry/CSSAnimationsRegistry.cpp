#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

bool CSSAnimationsRegistry::isEmpty() const {
  return registry_.empty();
}

bool CSSAnimationsRegistry::hasUpdates() const {
  return !runningAnimationIndicesMap_.empty() ||
      !delayedAnimationsManager_.empty();
}

void CSSAnimationsRegistry::apply(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
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
}

void CSSAnimationsRegistry::remove(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }

  for (const auto &animation : it->second.animationsVector) {
    delayedAnimationsManager_.remove(animation);
  }
  runningAnimationIndicesMap_.erase(viewTag);
  registry_.erase(viewTag);
}

UpdatesBatch CSSAnimationsRegistry::collectUpdates(const double timestamp) {
  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);

  UpdatesBatch updatesBatch;

  // Iterate over active animations and update them
  for (auto it = runningAnimationIndicesMap_.begin();
       it != runningAnimationIndicesMap_.end();) {
    const auto viewTag = it->first;
    const auto &animationsVector = registry_.at(viewTag).animationsVector;

    const auto &[shadowNode, updates] =
        updateViewAnimations(animationsVector, it->second, timestamp);

    if (!updates.empty()) {
      updatesBatch.emplace_back(shadowNode, std::move(updates));
    }

    if (runningAnimationIndicesMap_[viewTag].empty()) {
      it = runningAnimationIndicesMap_.erase(it);
    } else {
      ++it;
    }
  }

  return updatesBatch;
}

CSSAnimationsVector CSSAnimationsRegistry::buildAnimationsVector(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
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

std::pair<ShadowNode::Shared, folly::dynamic>
CSSAnimationsRegistry::updateViewAnimations(
    const std::vector<std::shared_ptr<CSSAnimation>> &animationsVector,
    std::set<size_t> &runningAnimationIndices,
    const double timestamp) {
  folly::dynamic updates = folly::dynamic::object();

  ShadowNode::Shared shadowNode;

  for (auto it = runningAnimationIndices.begin();
       it != runningAnimationIndices.end();) {
    const auto runningAnimationIndex = *it;
    const auto &animation = animationsVector[runningAnimationIndex];

    if (!shadowNode) {
      shadowNode = animation->getShadowNode();
    }

    updates.update(updateViewAnimation(animation, timestamp));

    if (animation->getState(timestamp) != AnimationProgressState::Running) {
      it = runningAnimationIndices.erase(it);
    } else {
      ++it;
    }
  }

  return {shadowNode, updates};
}

folly::dynamic CSSAnimationsRegistry::updateViewAnimation(
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  if (animation->getState(timestamp) == AnimationProgressState::Pending) {
    animation->run(timestamp);
  }

  const auto updates = animation->update(timestamp);
  const auto newState = animation->getState(timestamp);

  if (newState == AnimationProgressState::Finished &&
      !animation->hasForwardsFillMode()) {
    // We want to remove style changes applied by the animation that is
    // finished and has no forwards fill mode. In order to remove changes
    // applied by the CSS animation, we have to commit the view style
    // props that it would have if there was no animation applied.
    return animation->getResetStyle();
  }

  return updates;
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

} // namespace reanimated
