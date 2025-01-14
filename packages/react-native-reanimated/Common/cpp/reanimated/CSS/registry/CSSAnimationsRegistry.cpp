#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

void CSSAnimationsRegistry::set(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::vector<std::shared_ptr<CSSAnimation>> &animations,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();
  clearViewAnimations(viewTag);

  registry_[viewTag] = std::move(animations);
  for (const auto &animation : animations) {
    scheduleOrActivateAnimation(rt, animation, timestamp);
  }
  applyViewAnimationsStyle(rt, viewTag, timestamp);
}

void CSSAnimationsRegistry::remove(
    jsi::Runtime &rt,
    const Tag viewTag,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  clearViewAnimations(viewTag);
}

void CSSAnimationsRegistry::updateSettings(
    jsi::Runtime &rt,
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
    scheduleOrActivateAnimation(rt, animation, timestamp);
    updatedIndices.emplace_back(animationIndex);
  }

  if (!updatedIndices.empty()) {
    updateViewAnimations(rt, viewTag, updatedIndices, timestamp, false);
    applyViewAnimationsStyle(rt, viewTag, timestamp);
  }
}

void CSSAnimationsRegistry::update(jsi::Runtime &rt, const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Update styles in the registry for views which animations were reverted
  handleAnimationsToRevert(rt, timestamp);

  // Iterate over active animations and update them
  for (auto it = runningAnimationsMap_.begin();
       it != runningAnimationsMap_.end();) {
    const auto viewTag = it->first;
    const std::vector<unsigned> animationIndices = {
        it->second.begin(), it->second.end()};
    updateViewAnimations(rt, viewTag, animationIndices, timestamp, true);

    if (registry_.find(viewTag) == registry_.end() ||
        registry_[viewTag].empty()) {
      it = runningAnimationsMap_.erase(it);
    } else {
      ++it;
    }
  }
}

void CSSAnimationsRegistry::updateViewAnimations(
    jsi::Runtime &rt,
    const Tag viewTag,
    const std::vector<unsigned> &animationIndices,
    const double timestamp,
    const bool addToBatch) {
  jsi::Object result = jsi::Object(rt);
  ShadowNode::Shared shadowNode = nullptr;
  bool hasUpdates = false;

  for (const auto animationIndex : animationIndices) {
    const auto &animation = registry_[viewTag][animationIndex];
    if (!shadowNode) {
      shadowNode = animation->getShadowNode();
    }
    if (animation->getState(timestamp) == AnimationProgressState::PENDING) {
      animation->run(timestamp);
    }

    bool updatesAddedToBatch = false;
    const auto updates = animation->update(rt, timestamp);
    const auto newState = animation->getState(timestamp);

    if (newState == AnimationProgressState::FINISHED) {
      // Revert changes applied during animation if there is no forwards fill
      // mode
      if (addToBatch && !animation->hasForwardsFillMode()) {
        //  We also have to manually commit style values
        // reverting the changes applied by the animation.
        hasUpdates =
            addStyleUpdates(rt, result, animation->resetStyle(rt), false) ||
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
      hasUpdates = addStyleUpdates(rt, result, updates, true) || hasUpdates;
    }
    if (newState != AnimationProgressState::RUNNING) {
      runningAnimationsMap_[viewTag].erase(animationIndex);
    }
  }

  if (hasUpdates) {
    updatesBatch_.emplace_back(
        shadowNode, std::make_unique<jsi::Value>(rt, result));
  }
}

bool CSSAnimationsRegistry::addStyleUpdates(
    jsi::Runtime &rt,
    jsi::Object &target,
    const jsi::Value &updates,
    bool override) {
  if (!updates.isObject()) {
    return false;
  }

  bool hasUpdates = false;
  const auto updatesObject = updates.asObject(rt);
  const auto propertyNames = updatesObject.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt);
    const auto propertyValue = updatesObject.getProperty(rt, propertyName);

    if (override || target.getProperty(rt, propertyName).isUndefined()) {
      target.setProperty(rt, propertyName, propertyValue);
      hasUpdates = true;
    }
  }

  return hasUpdates;
}

void CSSAnimationsRegistry::scheduleOrActivateAnimation(
    jsi::Runtime &rt,
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
    if (animation->getState(timestamp) != AnimationProgressState::PAUSED) {
      delayedAnimationsManager_.add(startTimestamp, id);
    }
  } else {
    // Otherwise, activate the animation immediately
    const auto [viewTag, animationIndex] = id;
    runningAnimationsMap_[viewTag].insert(animationIndex);
  }
}

void CSSAnimationsRegistry::clearViewAnimations(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }

  for (const auto &animation : it->second) {
    delayedAnimationsManager_.remove(animation->getId());
  }
  runningAnimationsMap_.erase(viewTag);
  updatesRegistry_.erase(viewTag);
}

void CSSAnimationsRegistry::applyViewAnimationsStyle(
    jsi::Runtime &rt,
    const Tag viewTag,
    const double timestamp) {
  const auto it = registry_.find(viewTag);
  // Remove the style from the registry if there are no animations for the view
  if (it == registry_.end() || it->second.empty()) {
    updatesRegistry_.erase(viewTag);
    return;
  }

  folly::dynamic updatedStyle = folly::dynamic::object();
  ShadowNode::Shared shadowNode = nullptr;

  for (const auto &animation : it->second) {
    const auto startTimestamp = animation->getStartTimestamp(timestamp);

    jsi::Value style;
    const auto &currentState = animation->getState(timestamp);
    if (startTimestamp == timestamp ||
        (startTimestamp > timestamp && animation->hasBackwardsFillMode())) {
      style = animation->getBackwardsFillStyle(rt);
    } else if (currentState == AnimationProgressState::FINISHED) {
      if (animation->hasForwardsFillMode()) {
        style = animation->getForwardFillStyle(rt);
      }
    } else if (currentState != AnimationProgressState::PENDING) {
      style = animation->getCurrentInterpolationStyle(rt);
    }

    if (!style.isUndefined()) {
      shadowNode = animation->getShadowNode();
      updatedStyle.update(dynamicFromValue(rt, style));
    }
  }

  if (updatedStyle.empty()) {
    updatesRegistry_.erase(viewTag);
  } else {
    updatesRegistry_[viewTag] =
        std::make_pair(shadowNode, std::move(updatedStyle));
  }
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

void CSSAnimationsRegistry::handleAnimationsToRevert(
    jsi::Runtime &rt,
    const double timestamp) {
  for (const auto &[viewTag, _] : animationsToRevertMap_) {
    applyViewAnimationsStyle(rt, viewTag, timestamp);
  }
  animationsToRevertMap_.clear();
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
