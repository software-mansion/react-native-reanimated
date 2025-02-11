#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated {

std::shared_ptr<CSSAnimationKeyframesConfig> CSSKeyframesRegistry::get(
    const std::string &animationName) const {
  const auto it = registry_.find(animationName);
  if (it == registry_.end()) {
    throw std::runtime_error(
        "[Reanimated] " + animationName +
        " not found in the keyframes registry.");
  }
  return it->second;
}

void CSSKeyframesRegistry::set(
    const std::string &animationName,
    const std::shared_ptr<AnimationStyleInterpolator> &interpolator) {
  interpolators_[animationName] = interpolator;
}

void CSSKeyframesRegistry::remove(const std::string &animationName) {
  interpolators_.erase(animationName);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
