#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

void CSSAnimationsRegistry::updateSettings(
    jsi::Runtime &rt,
    const unsigned id,
    const PartialCSSAnimationSettings &updatedSettings,
    const time_t timestamp) {
  registry_.at(id)->updateSettings(rt, updatedSettings, timestamp);
  operationsBatch_.emplace_back(AnimationOperation::ACTIVATE, id);
}

void CSSAnimationsRegistry::add(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto id = animation->getId();
  registry_.insert({id, animation});

  // Apply animation backwards fill style if it exists
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

void CSSAnimationsRegistry::update(jsi::Runtime &rt, const time_t timestamp) {
  std::lock_guard<std::mutex> lock{mutex_};

  // Activate all delayed animations that should start now
  activateDelayedAnimations(timestamp);
  // Flush all operations from the batch
  flushOperations(rt, timestamp);

  // Iterate over active animations and update them
  for (const auto &id : runningAnimationIds_) {
    const auto &animation = registry_.at(id);
    const jsi::Value &updates = handleUpdate(rt, timestamp, animation);

    if (updates.isUndefined()) {
      operationsBatch_.emplace_back(AnimationOperation::DEACTIVATE, id);
    } else {
      updatesBatch_.emplace_back(
          animation->getShadowNode(),
          std::make_unique<jsi::Value>(rt, updates));
    }
  }
}

void CSSAnimationsRegistry::activateDelayedAnimations(const time_t timestamp) {
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

void CSSAnimationsRegistry::flushOperations(
    jsi::Runtime &rt,
    const time_t timestamp) {
  auto copiedOperationsBatch = std::move(operationsBatch_);
  operationsBatch_.clear();

  for (const auto &[operation, id] : copiedOperationsBatch) {
    const auto &animationIt = registry_.find(id);
    // Handle the operation only if the animation was not removed from the
    // registry
    if (animationIt != registry_.end()) {
      handleOperation(rt, operation, registry_.at(id), timestamp);
    }
  }
}

jsi::Value CSSAnimationsRegistry::handleUpdate(
    jsi::Runtime &rt,
    const time_t timestamp,
    const std::shared_ptr<CSSAnimation> &animation) {
  switch (animation->getState(timestamp)) {
    case AnimationProgressState::PENDING:
      animation->run(timestamp);
      break;
    case AnimationProgressState::PAUSED:
      operationsBatch_.emplace_back(
          AnimationOperation::DEACTIVATE, animation->getId());
      break;
    case AnimationProgressState::FINISHED:
      operationsBatch_.emplace_back(
          AnimationOperation::FINISH, animation->getId());
      break;
    default:
      break;
  }

  return animation->update(rt, timestamp);
}

void CSSAnimationsRegistry::handleOperation(
    jsi::Runtime &rt,
    const AnimationOperation operation,
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  switch (operation) {
    case AnimationOperation::ACTIVATE:
      activateOperation(animation->getId());
      break;
    case AnimationOperation::DEACTIVATE:
      deactivateOperation(animation, timestamp);
      break;
    case AnimationOperation::FINISH:
      finishOperation(rt, animation, timestamp);
      break;
  }
}

void CSSAnimationsRegistry::activateOperation(const unsigned id) {
  runningAnimationIds_.insert(id);
}

void CSSAnimationsRegistry::deactivateOperation(
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  runningAnimationIds_.erase(animation->getId());
  const auto animationState = animation->getState(timestamp);

  // Remove tag from the registry if the animation is deactivated after
  // finishing and has no forwards fill mode or if the animation is deactivated
  // before starting and has no backwards fill mode
  // (the only one other case when the animation can be deactivated is setting
  // its play state to paused - in such a case we don't want to remove the tag)
  if ((animationState == AnimationProgressState::PENDING &&
       !animation->hasBackwardsFillMode()) ||
      (animationState == AnimationProgressState::FINISHED &&
       !animation->hasForwardsFillMode())) {
    tagsToRemove_.insert(animation->getShadowNode()->getTag());
  }
}

void CSSAnimationsRegistry::finishOperation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  deactivateOperation(animation, timestamp);
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
