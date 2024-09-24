#include <reanimated/CSS/CSSRegistry.h>

namespace reanimated {

bool CSSRegistry::hasActiveAnimations() const {
  return !activeAnimationIds_.empty();
}

bool CSSRegistry::isCssLoopRunning() const {
  return cssLoopRunning_;
}

void CSSRegistry::setCssLoopRunning(const bool running) {
  cssLoopRunning_ = running;
}

void CSSRegistry::add(
    jsi::Runtime &rt,
    const unsigned id,
    const std::shared_ptr<CSSAnimation> &animation,
    const jsi::Value &viewStyle) {
  animation->updateViewStyle(rt, viewStyle);
  registry_.insert({id, animation});
  activeAnimationIds_.insert(id);
}

void CSSRegistry::remove(const unsigned id, const bool revertChanges) {
  auto registryEntry = registry_.find(id);
  if (registryEntry != registry_.end()) {
    registryEntry->second->finish(revertChanges);
    // We don't call removeAnimation here immediately,
    // to ensure reverting animations remain active until the final frame style
    // (reverted style) is applied.
  }
}

void CSSRegistry::updateConfig(
    jsi::Runtime &rt,
    const unsigned id,
    const jsi::Value &settings,
    const jsi::Value &viewStyle) {
  auto registryEntry = registry_.find(id);
  if (registryEntry == registry_.end()) {
    return;
  }
  auto animation = registryEntry->second;
  animation->updateSettings(rt, settings);
  animation->updateViewStyle(rt, viewStyle);
}

UpdatesBatch CSSRegistry::update(jsi::Runtime &rt, const double timestamp) {
  UpdatesBatch batch;
  std::vector<unsigned> idsToDeactivate;
  std::vector<unsigned> idsToRemove;

  for (const auto &id : activeAnimationIds_) {
    auto registryEntry = registry_.find(id);
    if (registryEntry == registry_.end()) {
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
          batch.emplace_back(
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

  return batch;
}

void CSSRegistry::activateAnimation(const unsigned id) {
  if (inactiveAnimationIds_.find(id) != inactiveAnimationIds_.end()) {
    inactiveAnimationIds_.erase(id);
    activeAnimationIds_.insert(id);
  }
}

void CSSRegistry::deactivateAnimation(const unsigned id) {
  auto registryEntry = registry_.find(id);
  if (registryEntry != registry_.end()) {
    activeAnimationIds_.erase(id);
    inactiveAnimationIds_.insert(id);
  }
}

void CSSRegistry::removeAnimation(const unsigned id) {
  activeAnimationIds_.erase(id);
  inactiveAnimationIds_.erase(id);
  registry_.erase(id);
}

} // namespace reanimated
