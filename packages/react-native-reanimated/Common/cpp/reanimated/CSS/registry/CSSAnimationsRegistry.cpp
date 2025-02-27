#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

bool CSSAnimationsRegistry::hasUpdates() const {
  return !runningAnimationsMap_.empty() || !delayedAnimationsManager_.empty();
}

void CSSAnimationsRegistry::set(
    const ShadowNode::Shared &shadowNode,
    std::vector<std::shared_ptr<CSSAnimation>> &&animations,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();
  removeViewAnimations(viewTag);

  const auto &storedAnimations = registry_[viewTag] = std::move(animations);

  for (const auto &animation : storedAnimations) {
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

void CSSAnimationsRegistry::updateSettings(
    const Tag viewTag,
    const SettingsUpdates &settingsUpdates,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }
  const auto &animationIndices = it->second;
  std::vector<unsigned> updatedIndices;
  updatedIndices.reserve(settingsUpdates.size());

  for (const auto &[animationIndex, updatedSettings] : settingsUpdates) {
    // Skip animations that don't exist in the registry
    if (animationIndex >= animationIndices.size()) {
      continue;
    }

    const auto &animation = it->second[animationIndex];
    animation->updateSettings(updatedSettings, timestamp);
    scheduleOrActivateAnimation(animation, timestamp);
    updatedIndices.emplace_back(animationIndex);
  }

  if (!updatedIndices.empty()) {
    updateViewAnimations(viewTag, updatedIndices, timestamp, false);
    applyViewAnimationsStyle(viewTag, timestamp);
  }
}

void CSSAnimationsRegistry::update(const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Update styles in the registry for views which animations were reverted
  handleAnimationsToRevert(timestamp);

  // Iterate over active animations and update them
  for (auto it = runningAnimationsMap_.begin();
       it != runningAnimationsMap_.end();) {
    const auto viewTag = it->first;
    const std::vector<unsigned> animationIndices = {
        it->second.begin(), it->second.end()};
    updateViewAnimations(viewTag, animationIndices, timestamp, true);

    if (runningAnimationsMap_.at(viewTag).empty()) {
      it = runningAnimationsMap_.erase(it);
    } else {
      ++it;
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
      runningAnimationsMap_[viewTag].erase(animationIndex);
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
    runningAnimationsMap_[viewTag].insert(animationIndex);
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
  runningAnimationsMap_.erase(viewTag);
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
      runningAnimationsMap_[viewTag].insert(animationIndex);
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

bool CSSAnimationsRegistry::isEmpty() {
  return UpdatesRegistry::isEmpty() && registry_.empty() &&
      runningAnimationsMap_.empty() && animationsToRevertMap_.empty();
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
