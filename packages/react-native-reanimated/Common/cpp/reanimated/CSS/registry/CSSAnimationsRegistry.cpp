#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

bool CSSAnimationsRegistry::hasUpdates() const {
  return !runningAnimationIndicesMap_.empty() ||
      !delayedAnimationsManager_.empty();
}

bool CSSAnimationsRegistry::isEmpty() const {
  return UpdatesRegistry::isEmpty() && registry_.empty() &&
      runningAnimationIndicesMap_.empty() && animationsToRevertMap_.empty();
}

void CSSAnimationsRegistry::apply(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::vector<std::string> &animationNames,
    const AnimationsMap &addedAnimations,
    const std::unordered_map<std::string, PartialCSSAnimationSettings>
        &settingsUpdates,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};
  const auto viewTag = shadowNode->getTag();

  const auto animationsVector =
      getAnimationsVector(viewTag, animationNames, addedAnimations);

  if (animationsVector.empty()) {
    remove(viewTag);
    return;
  }

  registry_[viewTag] = std::move(animationsVector);
  updateAnimationSettings(animationsVector, settingsUpdates, timestamp);

  for (const auto &animation : animationsVector) {
    scheduleOrActivateAnimation(animation, timestamp);
  }
  applyViewAnimationsStyle(viewTag, timestamp);
}

void CSSAnimationsRegistry::remove(const Tag viewTag) {
  std::lock_guard<std::mutex> lock{mutex_};

  removeViewAnimations(viewTag);
  removeFromUpdatesRegistry(viewTag);

  registry_.erase(viewTag);
}

void CSSAnimationsRegistry::removeBatch(const std::vector<Tag> &tagsToRemove) {
  std::lock_guard<std::mutex> lock{mutex_};

  for (const auto &viewTag : tagsToRemove) {
    removeViewAnimations(viewTag);
    removeFromUpdatesRegistry(viewTag);

    registry_.erase(viewTag);
  }
}

void CSSAnimationsRegistry::update(const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Update styles in the registry for views which animations were reverted
  handleAnimationsToRevert(timestamp);

  // Iterate over active animations and update them
  for (auto it = runningAnimationIndicesMap_.begin();
       it != runningAnimationIndicesMap_.end();) {
    const auto viewTag = it->first;
    const std::vector<unsigned> animationIndices = {
        it->second.begin(), it->second.end()};
    updateViewAnimations(viewTag, animationIndices, timestamp, true);

    if (runningAnimationIndicesMap_.at(viewTag).empty()) {
      it = runningAnimationIndicesMap_.erase(it);
    } else {
      ++it;
    }
  }
}

AnimationsVector CSSAnimationsRegistry::getAnimationsVector(
    const Tag viewTag,
    const std::vector<std::string> &animationNames,
    const AnimationsMap &addedAnimations) const {
  const auto it = registry_.find(viewTag);

  // If animationNames vector is empty, no animations were added, removed
  // or reordered, thus we can return the animations vector from the registry
  if (animationNames.empty()) {
    if (it != registry_.end()) {
      return std::move(it->second);
    }
  }

  // Otherwise, build the new animations vector
  AnimationsMap oldAnimationsMap;

  if (it != registry_.end()) {
    for (const auto &animation : it->second) {
      oldAnimationsMap[animation->getName()] = animation;
    }
  }

  AnimationsVector resultAnimations;
  resultAnimations.reserve(animationNames.size());

  for (const auto &name : animationNames) {
    if (addedAnimations.find(name) != addedAnimations.end()) {
      resultAnimations.emplace_back(addedAnimations.at(name));
    } else if (oldAnimationsMap.find(name) != oldAnimationsMap.end()) {
      resultAnimations.emplace_back(oldAnimationsMap.at(name));
    } else {
      throw std::runtime_error(
          "[Reanimated] Animation with name " + name +
          " is missing a configuration object and cannot be attached");
    }
  }

  return resultAnimations;
}

void CSSAnimationsRegistry::updateAnimationSettings(
    const AnimationsVector &animationsVector,
    const std::unordered_map<std::string, PartialCSSAnimationSettings>
        &settingsUpdates,
    const double timestamp) {
  for (const auto &animation : animationsVector) {
    const auto it = settingsUpdates.find(animation->getName());
    if (it != settingsUpdates.end()) {
      animation->updateSettings(it->second, timestamp);
    }
  }
}

void CSSAnimationsRegistry::updateViewAnimations(
    const Tag viewTag,
    const std::vector<unsigned> &animationIndices,
    const double timestamp,
    const bool addToBatch) {
  folly::dynamic result = folly::dynamic::object;
  ShadowNode::Shared shadowNode = nullptr;
  bool hasUpdates = false;

  for (const auto animationIndex : animationIndices) {
    const auto &animation = registry_[viewTag][animationIndex];
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
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  const auto id = animation->getId();
  const auto startTimestamp = animation->getStartTimestamp(timestamp);

  // Remove the animation from delayed (if it is already added to
  // delayed animations)
  delayedAnimationsManager_.remove(id);

  if (startTimestamp > timestamp) {
    // If the animation is delayed, schedule it for activation
    // (Only if it isn't paused)
    if (animation->getState(timestamp) != AnimationProgressState::Paused) {
      delayedAnimationsManager_.add(startTimestamp, id);
    }
  } else {
    // Otherwise, activate the animation immediately
    const auto [viewTag, animationIndex] = id;
    runningAnimationIndicesMap_[viewTag].insert(animationIndex);
  }
}

void CSSAnimationsRegistry::removeViewAnimations(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }

  for (const auto &animation : it->second) {
    delayedAnimationsManager_.remove(animation->getId());
  }
  runningAnimationIndicesMap_.erase(viewTag);
}

void CSSAnimationsRegistry::applyViewAnimationsStyle(
    const Tag viewTag,
    const double timestamp) {
  const auto it = registry_.find(viewTag);
  // Remove the style from the registry if there are no animations for the view
  if (it == registry_.end() || it->second.empty()) {
    removeFromUpdatesRegistry(viewTag);
    return;
  }

  folly::dynamic updatedStyle = folly::dynamic::object;
  ShadowNode::Shared shadowNode = nullptr;

  for (const auto &animation : it->second) {
    const auto startTimestamp = animation->getStartTimestamp(timestamp);

    folly::dynamic style;
    const auto &currentState = animation->getState(timestamp);
    if (startTimestamp == timestamp ||
        (startTimestamp > timestamp && animation->hasBackwardsFillMode())) {
      style = animation->getBackwardsFillStyle();
    } else if (currentState == AnimationProgressState::Finished) {
      if (animation->hasForwardsFillMode()) {
        style = animation->getForwardsFillStyle();
      }
    } else if (currentState != AnimationProgressState::Pending) {
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
    const auto delayedAnimation = delayedAnimationsManager_.pop();
    const auto [viewTag, animationIndex] = delayedAnimation.id;

    // Add only these animations which weren't removed in the meantime
    if (registry_.find(viewTag) != registry_.end() &&
        registry_.at(viewTag).size() > animationIndex) {
      runningAnimationIndicesMap_[viewTag].insert(animationIndex);
    }
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
        target.at(propertyName).isNull()) {
      target[propertyName] = propertyValue;
      hasUpdates = true;
    }
  }

  return hasUpdates;
}

} // namespace reanimated
