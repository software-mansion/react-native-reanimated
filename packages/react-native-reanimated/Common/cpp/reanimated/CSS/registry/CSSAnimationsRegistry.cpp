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
  animation->updateSettings(updatedSettings, timestamp);
  scheduleOrActivateAnimation(rt, animation, timestamp);
}

void CSSAnimationsRegistry::add(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  registry_.insert({animation->getId(), animation});
  scheduleOrActivateAnimation(rt, animation, timestamp);
}

void CSSAnimationsRegistry::remove(const unsigned id) {
  std::lock_guard<std::mutex> lock{mutex_};

  runningAnimationIds_.erase(id);
  delayedAnimationsMap_.erase(id);
  // We currently support only one animation per shadow node, so we can safely
  // remove the tag from the updates registry once the associated animation is
  // removed
  updatesRegistry_.erase(registry_.at(id)->getShadowNode()->getTag());
  registry_.erase(id);
}

void CSSAnimationsRegistry::update(jsi::Runtime &rt, const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);

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
        tagsToRemove_.insert(animation->getShadowNode()->getTag());
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

void CSSAnimationsRegistry::applyStyleBeforeStart(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation) {
  const auto &fillStyle = animation->getBackwardsFillStyle(rt);
  if (!fillStyle.isUndefined()) {
    // Apply animation backwards fill style if animation has backwards fill mode
    const auto shadowNode = animation->getShadowNode();
    updatesRegistry_[shadowNode->getTag()] =
        std::make_pair(shadowNode, dynamicFromValue(rt, fillStyle));
  } else {
    // Otherwise, remove style overrides from the registry
    updatesRegistry_.erase(animation->getShadowNode()->getTag());
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
    // Apply the backwards fill style if the animation has a backwards fill mode
    // or remove the style overrides from the updates registry (e.g. if the
    // delay of the animation was increased)
    applyStyleBeforeStart(rt, animation);

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

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
