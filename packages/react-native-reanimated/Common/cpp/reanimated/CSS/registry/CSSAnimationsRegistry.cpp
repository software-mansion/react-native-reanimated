#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

void CSSAnimationsRegistry::updateSettings(
    jsi::Runtime &rt,
    const unsigned id,
    const PartialCSSAnimationSettings &updatedSettings,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto &animation = registry_.at(id);
  const auto viewTag = animation->getShadowNode()->getTag();
  animationsToRemove_.erase(id);
  affectedViewTags_.insert(viewTag);

  animation->updateSettings(updatedSettings, timestamp);

  scheduleOrActivateAnimation(rt, animation, timestamp);
  runAffectedViewUpdates(rt, timestamp);
}

void CSSAnimationsRegistry::add(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto id = animation->getId();
  const auto viewTag = animation->getShadowNode()->getTag();
  animationsToRemove_.erase(id);
  affectedViewTags_.insert(viewTag);

  registry_.insert({id, animation});
  viewAnimationIds_[animation->getShadowNode()->getTag()].insert(id);

  scheduleOrActivateAnimation(rt, animation, timestamp);
  runAffectedViewUpdates(rt, timestamp);
}

void CSSAnimationsRegistry::remove(
    jsi::Runtime &rt,
    const jsi::Array &animationIds,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto size = animationIds.size(rt);
  for (size_t i = 0; i < size; ++i) {
    const auto id = animationIds.getValueAtIndex(rt, i).asNumber();
    handleAnimationRemoval(id);
  }

  runAffectedViewUpdates(rt, timestamp);
}

void CSSAnimationsRegistry::update(jsi::Runtime &rt, const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Remove animations that are marked for removal
  runMarkedRemovals(rt, timestamp);
  // Update affected views after animation removals (if any were removed)
  runAffectedViewUpdates(rt, timestamp);

  // Iterate over active animations and update them
  for (auto it = runningAnimationIds_.begin();
       it != runningAnimationIds_.end();) {
    const auto &id = *it;
    const auto &animation = registry_.at(id);
    const auto &shadowNode = animation->getShadowNode();

    if (animation->getState(timestamp) == AnimationProgressState::PENDING) {
      animation->run(timestamp);
    }

    bool updatesAddedToBatch = false;
    const auto updates = animation->update(rt, timestamp);
    const auto newState = animation->getState(timestamp);

    if (newState == AnimationProgressState::FINISHED) {
      // Revert changes applied during animation if there is no forwards fill
      // mode
      if (!animation->hasForwardsFillMode()) {
        maybeAddUpdates(rt, shadowNode, animation->resetStyle(rt));
        updatesAddedToBatch = true;
      }
    }

    if (!updatesAddedToBatch) {
      maybeAddUpdates(rt, shadowNode, updates);
    }

    if (newState != AnimationProgressState::RUNNING) {
      it = runningAnimationIds_.erase(it);
    } else {
      ++it;
    }
  }
}

void CSSAnimationsRegistry::maybeAddUpdates(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &updatedStyle) {
  if (!updatedStyle.isUndefined()) {
    updatesBatch_.emplace_back(
        shadowNode, std::make_unique<jsi::Value>(rt, updatedStyle));
  }
}

void CSSAnimationsRegistry::activateDelayedAnimations(const double timestamp) {
  while (!delayedAnimationsQueue_.empty() &&
         delayedAnimationsQueue_.top()->startTimestamp <= timestamp) {
    const auto &delayedAnimation = delayedAnimationsQueue_.top();
    const auto animationId = delayedAnimation->id;
    delayedAnimationsQueue_.pop();

    // Add only these animations which weren't marked for removal
    // and weren't removed in the meantime
    if (delayedAnimation->startTimestamp != 0 &&
        registry_.find(animationId) != registry_.end()) {
      delayedAnimationsMap_.erase(animationId);
      runningAnimationIds_.insert(animationId);
    }
  }
}

void CSSAnimationsRegistry::scheduleOrActivateAnimation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  const auto id = animation->getId();
  const auto startTimestamp = animation->getStartTimestamp(timestamp);

  // Mark the already delayed animation for removal
  const auto delayedAnimationIt = delayedAnimationsMap_.find(id);
  if (delayedAnimationIt != delayedAnimationsMap_.end()) {
    delayedAnimationIt->second->startTimestamp = 0;
  }

  if (startTimestamp > timestamp) {
    // If the animation is delayed, schedule it for activation
    // (Only if it isn't paused)
    if (animation->getState(timestamp) != AnimationProgressState::PAUSED) {
      const auto delayedAnimation =
          std::make_shared<DelayedAnimation>(id, startTimestamp);
      delayedAnimationsMap_[id] = delayedAnimation;
      delayedAnimationsQueue_.push(delayedAnimation);
    }
  } else {
    runningAnimationIds_.insert(id);
  }
}

void CSSAnimationsRegistry::handleAnimationRemoval(const unsigned id) {
  const auto &animation = registry_.at(id);
  const auto viewTag = animation->getShadowNode()->getTag();

  affectedViewTags_.emplace(viewTag);
  runningAnimationIds_.erase(id);
  delayedAnimationsMap_.erase(id);
  registry_.erase(id);

  viewAnimationIds_[viewTag].erase(id);
  if (viewAnimationIds_[viewTag].empty()) {
    viewAnimationIds_.erase(viewTag);
  }
}

void CSSAnimationsRegistry::runMarkedRemovals(
    jsi::Runtime &rt,
    const double timestamp) {
  for (const auto id : animationsToRemove_) {
    handleAnimationRemoval(id);
  }
  animationsToRemove_.clear();
}

void CSSAnimationsRegistry::runAffectedViewUpdates(
    jsi::Runtime &rt,
    const double timestamp) {
  // Update styles stored in the updates registry for all affected nodes
  // (replace with the current style from all active animations on the node)
  for (const auto viewTag : affectedViewTags_) {
    const auto it = viewAnimationIds_.find(viewTag);

    // If the view has not even a single animation registered, remove style
    // overrides from the registry
    if (it == viewAnimationIds_.end()) {
      updatesRegistry_.erase(viewTag);
      continue;
    }

    // Otherwise, collect all styles from active animations and update the
    // registry
    folly::dynamic updatedStyle = folly::dynamic::object();
    ShadowNode::Shared shadowNode = nullptr;

    for (const auto id : it->second) {
      const auto &animation = registry_.at(id);
      if (!shadowNode) {
        shadowNode = animation->getShadowNode();
      }

      jsi::Value style;
      if (animation->getStartTimestamp(timestamp) > timestamp &&
          animation->hasBackwardsFillMode()) {
        style = animation->getBackwardsFillStyle(rt);
      } else if (
          animation->getState(timestamp) != AnimationProgressState::FINISHED ||
          animation->hasForwardsFillMode()) {
        style = animation->getCurrentInterpolationStyle(rt);
      }

      if (!style.isUndefined()) {
        updatedStyle.update(dynamicFromValue(rt, style));
      }
    }

    if (updatedStyle.empty()) {
      updatesRegistry_.erase(viewTag);
    } else {
      updatesRegistry_[viewTag] = std::make_pair(shadowNode, updatedStyle);
    }
  }

  affectedViewTags_.clear();
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
