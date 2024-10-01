#include <reanimated/Fabric/updates/CSSAnimationsRegistry.h>

namespace reanimated {

CSSAnimationsRegistry::CSSAnimationsRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

bool CSSAnimationsRegistry::hasAnimationUpdates() const {
  return !runningAnimationIds_.empty() || !delayedAnimationIds_.empty();
}

void CSSAnimationsRegistry::add(
    const unsigned id,
    const std::shared_ptr<CSSAnimation> &animation) {
  animationsRegistry_.insert({id, animation});
  operationsBatch_.emplace_back(AnimationOperation::add, id);
}

void CSSAnimationsRegistry::remove(const unsigned id) {
  operationsBatch_.emplace_back(AnimationOperation::remove, id);
}

void CSSAnimationsRegistry::update(jsi::Runtime &rt, const double timestamp) {
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

    switch (animation->getState()) {
      case pending:
        animation->run();
        // Don't break here, as we want to update the animation in the same
        // frame
      case running: {
        const jsi::Value &updates = animation->update(rt, timestamp);
        if (!updates.isUndefined()) {
          updatesBatch_.emplace_back(
              animation->getShadowNode(),
              std::make_unique<jsi::Value>(rt, updates));
        }
        break;
      }
      case paused:
        operationsBatch_.emplace_back(AnimationOperation::deactivate, id);
        break;
      case finished: {
        finishAnimation(rt, id);
        operationsBatch_.emplace_back(AnimationOperation::deactivate, id);
        break;
      }
    }
  }
}

void CSSAnimationsRegistry::activateDelayedAnimations(const double timestamp) {
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
    const double timestamp) {
  const auto copiedOperationsBatch = std::move(operationsBatch_);
  operationsBatch_.clear();

  for (const auto &[operation, id] : copiedOperationsBatch) {
    switch (operation) {
      case AnimationOperation::add:
        addAnimation(rt, id, timestamp);
        break;
      case AnimationOperation::remove:
        removeAnimation(rt, id);
        break;
      case AnimationOperation::activate:
        activateAnimation(id);
        break;
      case AnimationOperation::deactivate:
        deactivateAnimation(id);
        break;
    }
  }
}

std::optional<std::shared_ptr<CSSAnimation>> inline CSSAnimationsRegistry::
    getAnimation(const unsigned id) {
  const auto &animation = animationsRegistry_.find(id);
  if (animation == animationsRegistry_.end()) {
    operationsBatch_.emplace_back(AnimationOperation::remove, id);
    return std::nullopt;
  }

  return animation->second;
}

void CSSAnimationsRegistry::addAnimation(
    jsi::Runtime &rt,
    const unsigned id,
    const double timestamp) {
  const auto animationOptional = getAnimation(id);
  if (!animationOptional.has_value()) {
    return;
  }
  const auto animation = animationOptional.value();

  const auto delay = animation->getDelay();
  if (delay > 0) {
    // Add animation to the delayed animations queue
    delayedAnimationIds_.emplace(timestamp + delay, id);

    // Apply animation backwards fill style if it exists
    const auto &fillStyle = animation->getBackwardsFillStyle(rt);
    if (!fillStyle.isUndefined()) {
      updatesBatch_.emplace_back(
          animation->getShadowNode(),
          std::make_unique<jsi::Value>(rt, fillStyle));
    }
  } else {
    runningAnimationIds_.insert(id);
  }
}

void CSSAnimationsRegistry::finishAnimation(
    jsi::Runtime &rt,
    const unsigned id) {
  const auto animationOptional = getAnimation(id);
  if (!animationOptional.has_value()) {
    return;
  }
  const auto animation = animationOptional.value();

  // Apply animation forwards fill style or revert changes applied during
  // the animation
  const jsi::Value &style = animation->hasForwardsFillMode()
      ? animation->getForwardsFillStyle(rt)
      : animation->getCurrentStyle(rt);

  if (!style.isUndefined()) {
    updatesBatch_.emplace_back(
        animation->getShadowNode(), std::make_unique<jsi::Value>(rt, style));
  }
}

void CSSAnimationsRegistry::removeAnimation(
    jsi::Runtime &rt,
    const unsigned id) {
  finishAnimation(rt, id);
  // We currently support only one animation per shadow node, so we can safely
  // remove the tag from the updates registry once the associated animation is
  // removed
  const auto animationOptional = getAnimation(id);
  if (animationOptional.has_value()) {
    const auto animation = animationOptional.value();
    tagsToRemove_.insert(animation->getShadowNode()->getTag());
  }

  animationsRegistry_.erase(id);
  runningAnimationIds_.erase(id);
}

void CSSAnimationsRegistry::activateAnimation(const unsigned id) {
  runningAnimationIds_.insert(id);
}

void CSSAnimationsRegistry::deactivateAnimation(const unsigned id) {
  runningAnimationIds_.erase(id);

  const auto animationOptional = getAnimation(id);
  if (!animationOptional.has_value()) {
    return;
  }

  // Remove tag from the registry if the animation has no forwards fill mode
  // (we currently allow only one animation per shadow node so we can safely
  // remove the tag from the updates registry once the associated animation is
  // removed)
  const auto &animation = animationOptional.value();
  if (!animation->hasForwardsFillMode()) {
    tagsToRemove_.insert(animationOptional.value()->getShadowNode()->getTag());
  }
}

} // namespace reanimated
