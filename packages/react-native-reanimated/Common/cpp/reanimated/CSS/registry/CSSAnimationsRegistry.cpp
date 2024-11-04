#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

void CSSAnimationsRegistry::updateSettings(
    const unsigned id,
    const PartialCSSAnimationSettings &updatedSettings,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  registry_.at(id)->updateSettings(updatedSettings, timestamp);
  runningAnimationIds_.insert(id);
}

void CSSAnimationsRegistry::add(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const double timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto id = animation->getId();
  registry_.insert({id, animation});

  // Apply animation backwards fill style if it was set
  const auto &fillStyle = animation->getBackwardsFillStyle(rt);
  if (!fillStyle.isUndefined()) {
    const auto shadowNode = animation->getShadowNode();
    updatesRegistry_[shadowNode->getTag()] =
        std::make_pair(shadowNode, dynamicFromValue(rt, fillStyle));
  }

  const auto startTimestamp = animation->getDelay() + animation->getStartTime();
  if (startTimestamp > timestamp) {
    // Add animation to the delayed animations queue
    delayedAnimationIds_.insert(id);
    delayedAnimationsQueue_.emplace(startTimestamp, id);
  } else if (animation->getState(timestamp) != AnimationProgressState::PAUSED) {
    runningAnimationIds_.insert(id);
  }
}

void CSSAnimationsRegistry::remove(const unsigned id) {
  std::lock_guard<std::mutex> lock{mutex_};

  runningAnimationIds_.erase(id);
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

    if (animation->getState(timestamp) == AnimationProgressState::PENDING) {
      animation->run(timestamp);
    }

    const auto updates = animation->update(rt, timestamp);
    if (updates.isUndefined()) {
      updatesRegistry_.erase(animation->getShadowNode()->getTag());
    } else {
      updatesBatch_.emplace_back(
          animation->getShadowNode(),
          std::make_unique<jsi::Value>(rt, updates));
    }

    const auto newState = animation->getState(timestamp);
    if (newState == AnimationProgressState::FINISHED) {
      // Revert changes applied during animation if there is no forwards fill
      // mode
      if (!animation->hasForwardsFillMode()) {
        const auto &viewStyle = animation->resetStyle(rt);
        if (!viewStyle.isUndefined()) {
          updatesBatch_.emplace_back(
              animation->getShadowNode(),
              std::make_unique<jsi::Value>(rt, viewStyle));
        }
        tagsToRemove_.insert(animation->getShadowNode()->getTag());
      }
    }

    if (newState != AnimationProgressState::RUNNING) {
      it = runningAnimationIds_.erase(it);
    } else {
      ++it;
    }
  }
}

void CSSAnimationsRegistry::activateDelayedAnimations(const double timestamp) {
  while (!delayedAnimationsQueue_.empty() &&
         delayedAnimationsQueue_.top().first <= timestamp) {
    const auto [_, id] = delayedAnimationsQueue_.top();
    delayedAnimationsQueue_.pop();
    delayedAnimationIds_.erase(id);
    if (registry_.find(id) != registry_.end()) {
      runningAnimationIds_.insert(id);
    }
  }
}

} // namespace reanimated
