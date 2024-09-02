#include <reanimated/CSS/CSSAnimationsRegistry.h>

namespace reanimated {

void CSSAnimationsRegistry::addAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared node,
    const CSSAnimationConfig &config) {
  registry_.insert({tagManager_.getTag(), CSSAnimation(rt, node, config)});
}

void CSSAnimationsRegistry::markForRemoval(const unsigned int tag) {
  removalQueue_.push_back(tag);
}

void CSSAnimationsRegistry::runMarkedRemoval() {
  for (const auto &tagToRemove : removalQueue_) {
    registry_.erase(tagToRemove);
  }
  removalQueue_.clear();
}

bool CSSAnimationsRegistry::isCssLoopRunning() const {
  return cssLoopRunning_;
}

void CSSAnimationsRegistry::setCssLoopRunning(const bool running) {
  cssLoopRunning_ = running;
}

} // namespace reanimated
