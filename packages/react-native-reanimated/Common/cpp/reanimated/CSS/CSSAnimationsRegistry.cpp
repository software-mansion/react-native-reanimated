#include <reanimated/CSS/CSSAnimationsRegistry.h>

namespace reanimated {

void CSSAnimationsRegistry::addAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared node,
    const unsigned id,
    const CSSAnimationConfig &config,
    const jsi::Value &viewStyle) {
  CSSAnimation animation(rt, node, config);
  animation.setViewStyle(rt, viewStyle);
  registry_.insert({id, animation});
}

void CSSAnimationsRegistry::removeAnimation(const unsigned id) {
  // Just call finish on the animation itself to mark it as finished
  // (it will be automatically removed in updateAnimations)
  auto animation = registry_.find(id);
  if (animation != registry_.end()) {
    animation->second.finish();
  }
}

UpdatesBatch CSSAnimationsRegistry::updateAnimations(
    jsi::Runtime &rt,
    const double timestamp) {
  UpdatesBatch batch;

  for (auto &[animationTag, animation] : registry_) {
    switch (animation.getState()) {
      case CSSAnimationState::pending: {
        animation.start(timestamp);
        // don't break;
      }
      case CSSAnimationState::running:
      case CSSAnimationState::finishing: {
        auto shadowNode = animation.getShadowNode();

        const jsi::Value &updates = animation.update(rt, timestamp);

        if (updates.isUndefined()) {
          break;
        }

        batch.emplace_back(
            shadowNode, std::make_unique<jsi::Value>(rt, updates));
        break;
      }
      case CSSAnimationState::finished: {
        // we remove css animations lazily
        markForRemoval(animationTag);
        break;
      }
    }
  }

  // removing css animations after the loop because doing it during loop results
  // in segfault
  runMarkedRemoval();

  return batch;
}

bool CSSAnimationsRegistry::isEmpty() const {
  return registry_.empty();
}

bool CSSAnimationsRegistry::isCssLoopRunning() const {
  return cssLoopRunning_;
}

void CSSAnimationsRegistry::setCssLoopRunning(const bool running) {
  cssLoopRunning_ = running;
}

void CSSAnimationsRegistry::markForRemoval(const unsigned id) {
  removalQueue_.push_back(id);
}

void CSSAnimationsRegistry::runMarkedRemoval() {
  for (const auto &removedAnimationId : removalQueue_) {
    registry_.erase(removedAnimationId);
  }
  removalQueue_.clear();
}

} // namespace reanimated
