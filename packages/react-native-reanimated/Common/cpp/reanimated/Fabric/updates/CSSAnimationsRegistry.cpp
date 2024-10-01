#include <reanimated/Fabric/updates/CSSAnimationsRegistry.h>

namespace reanimated {

CSSAnimationsRegistry::CSSAnimationsRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

bool CSSAnimationsRegistry::hasAnimationUpdates() const {
  return !runningAnimationIds_.empty() || !delayedAnimationIds_.empty();
}

void CSSAnimationsRegistry::add(
    const std::shared_ptr<CSSAnimation> &animation) {
  const auto id = animation->getId();
  animationsRegistry_.insert({id, animation});
  operationsBatch_.emplace_back(AnimationOperation::ADD, id);
}

void CSSAnimationsRegistry::remove(const unsigned id) {
  operationsBatch_.emplace_back(AnimationOperation::REMOVE, id);
}

void CSSAnimationsRegistry::update(jsi::Runtime &rt, const time_t timestamp) {
  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Flush all operations from the batch
  flushOperations(rt, timestamp);

  // Iterate over active animations and update them
  for (const auto &id : runningAnimationIds_) {
    const auto animationOptional = getAnimation(id);
    if (!animationOptional.has_value()) {
      continue;
    }
    const auto animation = animationOptional.value();

    jsi::Value updates;
    switch (animation->getState(timestamp)) {
      case ProgressState::PENDING:
        animation->run(timestamp);
      // Don't break here, as we want to update the animation in the same
      // frame
      case ProgressState::RUNNING:
        updates = animation->update(rt, timestamp);
        break;
      case ProgressState::PAUSED: {
        // The paused animation must have been marked as active because of the
        // settings update, thus we need to call update to apply the changes and
        // then deactivate it
        updates = animation->update(rt, timestamp);
        operationsBatch_.emplace_back(AnimationOperation::DEACTIVATE, id);
        break;
      }
      case ProgressState::FINISHED: {
        // Add last frame updates before finishing the animation
        updates = animation->update(rt, timestamp);
        operationsBatch_.emplace_back(AnimationOperation::FINISH, id);
        break;
      }
    }

    if (!updates.isUndefined()) {
      updatesBatch_.emplace_back(
          animation->getShadowNode(),
          std::make_unique<jsi::Value>(rt, updates));
    }
  }
}

void CSSAnimationsRegistry::updateSettings(
    jsi::Runtime &rt,
    const unsigned id,
    const PartialCSSAnimationSettings &updatedSettings,
    const time_t timestamp) {
  const auto animationOptional = getAnimation(id);
  if (!animationOptional.has_value()) {
    return;
  }
  const auto &animation = animationOptional.value();
  animation->updateSettings(rt, updatedSettings, timestamp);

  const auto startTimestamp = animation->getDelay() + animation->getStartTime();
  if (startTimestamp > timestamp) {
    operationsBatch_.emplace_back(AnimationOperation::DEACTIVATE, id);
    operationsBatch_.emplace_back(AnimationOperation::ADD, id);
  } else {
    operationsBatch_.emplace_back(AnimationOperation::ACTIVATE, id);
  }
}

void CSSAnimationsRegistry::activateDelayedAnimations(const time_t timestamp) {
  while (!delayedAnimationIds_.empty() &&
         delayedAnimationIds_.top().first <= timestamp) {
    const auto [_, id] = delayedAnimationIds_.top();
    delayedAnimationIds_.pop();

    // Check if the animation is still in the registry
    const auto registryEntry = animationsRegistry_.find(id);
    if (registryEntry != animationsRegistry_.cend()) {
      runningAnimationIds_.insert(id);
    }
  }
}

void CSSAnimationsRegistry::flushOperations(
    jsi::Runtime &rt,
    const time_t timestamp) {
  const auto copiedOperationsBatch = std::move(operationsBatch_);
  operationsBatch_.clear();

  for (const auto &[operation, id] : copiedOperationsBatch) {
    const auto animationOptional = getAnimation(id);
    if (!animationOptional.has_value()) {
      continue;
    }
    const auto animation = animationOptional.value();

    switch (operation) {
      case AnimationOperation::ADD:
        addAnimation(rt, animation, timestamp);
        break;
      case AnimationOperation::REMOVE:
        removeAnimation(rt, animation);
        break;
      case AnimationOperation::ACTIVATE:
        activateAnimation(id);
        break;
      case AnimationOperation::DEACTIVATE:
        deactivateAnimation(animation, timestamp);
        break;
      case AnimationOperation::FINISH:
        finishAnimation(rt, animation, timestamp);
        break;
    }
  }
}

std::optional<std::shared_ptr<CSSAnimation>> inline CSSAnimationsRegistry::
    getAnimation(const unsigned id) {
  const auto &animation = animationsRegistry_.find(id);
  if (animation == animationsRegistry_.end()) {
    operationsBatch_.emplace_back(AnimationOperation::REMOVE, id);
    return std::nullopt;
  }

  return animation->second;
}

void CSSAnimationsRegistry::addAnimation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  const auto startTimestamp = animation->getDelay() + animation->getStartTime();
  if (startTimestamp > timestamp) {
    // Add animation to the delayed animations queue
    delayedAnimationIds_.emplace(startTimestamp, animation->getId());

    // Apply animation backwards fill style if it exists
    const auto &fillStyle = animation->getBackwardsFillStyle(rt);
    if (!fillStyle.isUndefined()) {
      updatesBatch_.emplace_back(
          animation->getShadowNode(),
          std::make_unique<jsi::Value>(rt, fillStyle));
    }
  } else if (animation->getState(timestamp) != ProgressState::PAUSED) {
    runningAnimationIds_.insert(animation->getId());
  }
}

void CSSAnimationsRegistry::removeAnimation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation) {
  // We currently support only one animation per shadow node, so we can safely
  // remove the tag from the updates registry once the associated animation is
  // removed
  tagsToRemove_.insert(animation->getShadowNode()->getTag());

  // Restore the view style before animation removal
  const jsi::Value &viewStyle = animation->getViewStyle(rt);
  if (!viewStyle.isUndefined()) {
    updatesBatch_.emplace_back(
        animation->getShadowNode(),
        std::make_unique<jsi::Value>(rt, viewStyle));
  }

  const auto id = animation->getId();
  animationsRegistry_.erase(id);
  runningAnimationIds_.erase(id);
}

void CSSAnimationsRegistry::activateAnimation(const unsigned id) {
  runningAnimationIds_.insert(id);
}

void CSSAnimationsRegistry::deactivateAnimation(
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  runningAnimationIds_.erase(animation->getId());
  const auto animationState = animation->getState(timestamp);

  // Remove tag from the registry if the animation is deactivated after
  // finishing and has no forwards fill mode or if the animation is deactivated
  // before starting and has no backwards fill mode
  // (the only one other case when the animation can be deactivated is setting
  // its play state to paused - in such a case we don't want to remove the tag)
  if ((animationState == ProgressState::PENDING &&
       !animation->hasBackwardsFillMode()) ||
      (animationState == ProgressState::FINISHED &&
       !animation->hasForwardsFillMode())) {
    tagsToRemove_.insert(animation->getShadowNode()->getTag());
  }
}

void CSSAnimationsRegistry::finishAnimation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  deactivateAnimation(animation, timestamp);
  // Apply animation forwards fill style or revert changes applied during
  // the animation
  const jsi::Value &updates = animation->hasForwardsFillMode()
      ? animation->getForwardsFillStyle(rt)
      : animation->getViewStyle(rt);

  if (!updates.isUndefined()) {
    updatesBatch_.emplace_back(
        animation->getShadowNode(), std::make_unique<jsi::Value>(rt, updates));
  }
}

} // namespace reanimated
