#include <reanimated/Fabric/updates/CSSAnimationsRegistry.h>

namespace reanimated {

bool CSSAnimationsRegistry::hasRunningAnimations() const {
  return !activeAnimationIds_.empty();
}

void CSSAnimationsRegistry::add(
    const unsigned id,
    const std::shared_ptr<CSSAnimation> &animation) {
  animationsRegistry_.insert({id, animation});
  activeAnimationIds_.insert(id);
}

void CSSAnimationsRegistry::remove(
    const unsigned id,
    const bool revertChanges) {
  auto registryEntry = animationsRegistry_.find(id);
  if (registryEntry != animationsRegistry_.end()) {
    registryEntry->second->finish(revertChanges);
    // We don't call removeAnimation here immediately,
    // to ensure reverting animations remain active until the final frame style
    // (reverted style) is applied.
  }
}

void CSSAnimationsRegistry::updateConfig(
    jsi::Runtime &rt,
    const unsigned id,
    const jsi::Value &settings,
    const jsi::Value &viewStyle) {
  auto registryEntry = animationsRegistry_.find(id);
  if (registryEntry == animationsRegistry_.end()) {
    return;
  }
  auto animation = registryEntry->second;
  animation->updateSettings(rt, settings);
  animation->updateViewStyle(rt, viewStyle);
}

void CSSAnimationsRegistry::update(jsi::Runtime &rt, const double timestamp) {
  std::vector<unsigned> idsToDeactivate;
  std::vector<unsigned> idsToRemove;

  for (const auto &id : activeAnimationIds_) {
    auto registryEntry = animationsRegistry_.find(id);
    if (registryEntry == animationsRegistry_.end()) {
      continue;
    }
    auto animation = registryEntry->second;

    switch (animation->getState()) {
      case CSSAnimationState::pending: {
        animation->start(timestamp);
        // fallthrough to the running state
      }
      case CSSAnimationState::running:
      case CSSAnimationState::finishing:
      case CSSAnimationState::reverting: {
        auto shadowNode = animation->getShadowNode();
        const jsi::Value &updates = animation->update(rt, timestamp);

        if (!updates.isUndefined()) {
          updatesBatch_.emplace_back(
              shadowNode, std::make_unique<jsi::Value>(rt, updates));
        }
        break;
      }
      case CSSAnimationState::paused:
      case CSSAnimationState::finished: {
        idsToDeactivate.push_back(id);
        break;
      }
      case CSSAnimationState::reverted: {
        idsToRemove.push_back(id);
        break;
      }
    }
  }

  for (const auto &id : idsToDeactivate) {
    deactivateAnimation(id);
  }
  for (const auto &id : idsToRemove) {
    removeAnimation(id);
  }
}

void CSSAnimationsRegistry::activateAnimation(const unsigned id) {
  if (inactiveAnimationIds_.find(id) != inactiveAnimationIds_.end()) {
    inactiveAnimationIds_.erase(id);
    activeAnimationIds_.insert(id);
  }
}

void CSSAnimationsRegistry::deactivateAnimation(const unsigned id) {
  auto registryEntry = animationsRegistry_.find(id);
  if (registryEntry != animationsRegistry_.end()) {
    activeAnimationIds_.erase(id);
    inactiveAnimationIds_.insert(id);
  }
}

void CSSAnimationsRegistry::removeAnimation(const unsigned id) {
  const auto it = animationsRegistry_.find(id);
  if (it != animationsRegistry_.end()) {
    const auto shadowNode = it->second->getShadowNode();
    tagsToRemove_.emplace_back(shadowNode->getTag());
  }
  activeAnimationIds_.erase(id);
  inactiveAnimationIds_.erase(id);
  animationsRegistry_.erase(id);
}

} // namespace reanimated
