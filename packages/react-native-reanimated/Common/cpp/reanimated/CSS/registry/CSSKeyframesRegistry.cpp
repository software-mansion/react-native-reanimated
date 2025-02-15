#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated {

const std::weak_ptr<CSSKeyframes> &CSSKeyframesRegistry::get(
    const std::string &animationName) const {
  const auto it = registry_.find(animationName);
  if (it == registry_.end()) {
    throw std::runtime_error(
        "[Reanimated] " + animationName +
        " not found in the keyframes registry.");
  }
  return it->second;
}

void CSSKeyframesRegistry::add(const std::weak_ptr<CSSKeyframes> &rule) {
  if (auto sharedRule = rule.lock()) {
    registry_[sharedRule->getAnimationName()] = rule;
  } else {
    throw std::runtime_error(
        "[Reanimated] Cannot add non-existent keyframes rule to registry");
  }
}

void CSSKeyframesRegistry::remove(const std::string &animationName) {
  registry_.erase(animationName);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
