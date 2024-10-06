#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>

namespace reanimated {

CSSAnimationsRegistry::CSSAnimationsRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

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
    case AnimationOperation::ADD:
      addOperation(rt, animation, timestamp);
      break;
    case AnimationOperation::REMOVE:
      removeOperation(rt, animation);
      break;
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

void CSSAnimationsRegistry::addOperation(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  const auto startTimestamp = animation->getDelay() + animation->getStartTime();
  if (startTimestamp > timestamp) {
    // Add animation to the delayed animations queue
    delayedIds_.emplace(startTimestamp, animation->getId());

    // Apply animation backwards fill style if it exists
    const auto &fillStyle = animation->getBackwardsFillStyle(rt);
    if (!fillStyle.isUndefined()) {
      updatesBatch_.emplace_back(
          animation->getShadowNode(),
          std::make_unique<jsi::Value>(rt, fillStyle));
    }
  } else if (animation->getState(timestamp) != AnimationProgressState::PAUSED) {
    runningIds_.insert(animation->getId());
  }
}

void CSSAnimationsRegistry::removeOperation(
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
  registry_.erase(id);
  runningIds_.erase(id);
}

void CSSAnimationsRegistry::activateOperation(const unsigned id) {
  runningIds_.insert(id);
}

void CSSAnimationsRegistry::deactivateOperation(
    const std::shared_ptr<CSSAnimation> &animation,
    const time_t timestamp) {
  runningIds_.erase(animation->getId());
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
