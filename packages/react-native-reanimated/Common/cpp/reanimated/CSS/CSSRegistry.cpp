#include <reanimated/CSS/CSSRegistry.h>

namespace reanimated {

void CSSRegistry::add(
    jsi::Runtime &rt,
    const unsigned id,
    const std::shared_ptr<CSSAnimation> &animation,
    const jsi::Value &viewStyle) {
  animation->updateViewStyle(rt, viewStyle);
  registry_.insert({id, animation});
}

void CSSRegistry::remove(const unsigned id) {
  auto animation = registry_.find(id);
  if (animation != registry_.end()) {
    animation->second->finish();
  }
}

UpdatesBatch CSSRegistry::update(jsi::Runtime &rt, const double timestamp) {
  UpdatesBatch batch;

  for (auto &[animationTag, animation] : registry_) {
    switch (animation->getState()) {
      case CSSAnimationState::pending: {
        animation->start(timestamp);
        // don't break;
      }
      case CSSAnimationState::running:
      case CSSAnimationState::finishing: {
        auto shadowNode = animation->getShadowNode();

        const jsi::Value &updates = animation->update(rt, timestamp);

        if (updates.isUndefined()) {
          break;
        }

        batch.emplace_back(
            shadowNode, std::make_unique<jsi::Value>(rt, updates));
        break;
      }
      case CSSAnimationState::finished: {
        markForRemoval(animationTag);
        break;
      }
    }
  }

  runMarkedRemoval();

  return batch;
}

bool CSSRegistry::isEmpty() const {
  return registry_.empty();
}

bool CSSRegistry::isCssLoopRunning() const {
  return cssLoopRunning_;
}

void CSSRegistry::setCssLoopRunning(const bool running) {
  cssLoopRunning_ = running;
}

void CSSRegistry::markForRemoval(const unsigned id) {
  removalQueue_.push_back(id);
}

void CSSRegistry::runMarkedRemoval() {
  for (const auto &removedAnimationId : removalQueue_) {
    registry_.erase(removedAnimationId);
  }
  removalQueue_.clear();
}

} // namespace reanimated
