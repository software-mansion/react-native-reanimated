#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated::css {

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

  LOG(INFO) << "Apply - erase tag: " << viewTag;
  runningAnimationIndicesMap_.erase(viewTag);
  registry_.erase(viewTag);
  registry_.emplace(
      viewTag,
      RegistryEntry{
          std::move(animationsVector),
          buildAnimationToIndexMap(animationsVector)});

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
  LOG(INFO) << "Remove - erase tag: " << viewTag;
  runningAnimationIndicesMap_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSAnimationsRegistry::flushFrameUpdates(
    PropsBatch &updatesBatch,
    const double timestamp) {
  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);

  // Iterate over active animations and update them
  for (auto it = runningAnimationIndicesMap_.begin();
       it != runningAnimationIndicesMap_.end();) {
    auto &[viewTag, runningAnimationIndices] = *it;

    std::ostringstream os;
    std::copy(
        runningAnimationIndices.begin(),
        runningAnimationIndices.end(),
        std::ostream_iterator<int>(os, " "));

    LOG(INFO) << "updateRunningViewAnimations tag: " << viewTag
              << " vector size: " << registry_[viewTag].animationsVector.size()
              << " indices count: " << runningAnimationIndices.size()
              << " indices: " << os.str();

    updatesBatch.emplace_back(updateRunningViewAnimations(
        registry_[viewTag].animationsVector,
        runningAnimationIndices,
        timestamp));

    if (runningAnimationIndicesMap_[viewTag].empty()) {
      LOG(INFO) << "flushFrameUpdates - erase animation for tag: " << viewTag;
      it = runningAnimationIndicesMap_.erase(it);
    } else {
      LOG(INFO) << "flushFrameUpdates - next animation for tag: " << viewTag;
      ++it;
    }
  }
}

void CSSAnimationsRegistry::collectAllProps(
    PropsMap &propsMap,
    double timestamp) {
  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);

  for (const auto &[_, registryEntry] : registry_) {
    const auto &[shadowNode, props] =
        updateAllViewAnimations(registryEntry.animationsVector, timestamp);
    addToPropsMap(propsMap, shadowNode, props);
  }
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

NodeWithPropsPair CSSAnimationsRegistry::updateRunningViewAnimations(
    const CSSAnimationsVector &animationsVector,
    std::set<size_t> &runningAnimationIndices,
    double timestamp) {
  folly::dynamic result = folly::dynamic::object();
  ShadowNode::Shared shadowNode;

  for (auto it = runningAnimationIndices.begin();
       it != runningAnimationIndices.end();) {
    const auto animationIndex = *it;
    const auto &animation = animationsVector[animationIndex];

    shadowNode = animation->getShadowNode();
    auto updates = updateAnimation(animation, timestamp);

    const auto newState = animation->getState(timestamp);
    if (newState == AnimationProgressState::Finished &&
        !animation->hasForwardsFillMode()) {
      updates = animation->getResetStyle();
    }

    if (!updates.empty()) {
      result.update(updates);
    }

    if (newState == AnimationProgressState::Running) {
      LOG(INFO) << "UpdateRunning - tag: " << shadowNode->getTag()
                << " animationIndex: " << animationIndex;
      ++it;
    } else {
      LOG(INFO) << "UpdateRunning - erase tag: " << shadowNode->getTag()
                << " animationIndex: " << animationIndex;
      it = runningAnimationIndices.erase(it);
    }
  }

  return {shadowNode, result};
}

NodeWithPropsPair CSSAnimationsRegistry::updateAllViewAnimations(
    const CSSAnimationsVector &animationsVector,
    double timestamp) {
  folly::dynamic result = folly::dynamic::object();
  ShadowNode::Shared shadowNode;

  for (const auto &animation : animationsVector) {
    shadowNode = animation->getShadowNode();
    const auto updates = updateAnimation(animation, timestamp);

    if (!updates.empty()) {
      result.update(updates);
    }
  }

  return {shadowNode, result};
}

folly::dynamic CSSAnimationsRegistry::updateAnimation(
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  if (animation->getState(timestamp) == AnimationProgressState::Pending) {
    animation->run(timestamp);
  }

  return animation->update(timestamp);
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
    LOG(INFO) << "Activate - tag: " << viewTag
              << " animationIndex: " << animationIndex;
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
    LOG(INFO) << "ActivateDelayed - tag: " << viewTag
              << " animationIndex: " << animationIndex;
    runningAnimationIndicesMap_[viewTag].insert(animationIndex);
  }
}

} // namespace reanimated::css
