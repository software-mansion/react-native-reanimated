#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSAnimationKeyframesRegistry.h>

namespace reanimated {

const CSSAnimationKeyframesConfig &CSSAnimationKeyframesRegistry::get(
    const std::string &animationName) const {
  const auto it = registry_.find(animationName);
  if (it == registry_.end()) {
    throw std::runtime_error(
        "[Reanimated] " + animationName +
        " not found in the keyframes registry.");
  }
  return it->second;
}

void CSSAnimationKeyframesRegistry::add(
    const std::string &animationName,
    CSSAnimationKeyframesConfig &&config) {
  registry_[animationName] = std::move(config);
}

void CSSAnimationKeyframesRegistry::remove(const std::string &animationName) {
  registry_.erase(animationName);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
