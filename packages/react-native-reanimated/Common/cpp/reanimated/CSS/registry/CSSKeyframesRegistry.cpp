#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated {

const std::shared_ptr<CSSKeyframes> &CSSKeyframesRegistry::get(
    const std::string &animationName) const {
  const auto it = registry_.find(animationName);
  if (it == registry_.end()) {
    throw std::runtime_error(
        "[Reanimated] " + animationName +
        " not found in the keyframes registry.");
  }
  return it->second;
}

void CSSKeyframesRegistry::add(const std::shared_ptr<CSSKeyframes> &rule) {
  registry_[rule->getAnimationName()] = rule;
}

void CSSKeyframesRegistry::remove(const std::string &animationName) {
  LOG(INFO) << "Removing keyframes for animation: " << animationName;
  registry_.erase(animationName);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
