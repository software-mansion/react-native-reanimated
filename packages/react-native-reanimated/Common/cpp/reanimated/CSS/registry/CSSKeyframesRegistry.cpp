#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated {

bool CSSKeyframesRegistry::has(const std::string &animationName) const {
  return interpolators_.find(animationName) != interpolators_.end();
}

std::shared_ptr<AnimationStyleInterpolator> CSSKeyframesRegistry::get(
    const std::string &animationName) const {
  if (!has(animationName)) {
    throw std::runtime_error(
        "[Reanimated] Keyframes for animation `" + animationName +
        "` not found in the registry.");
  }
  return interpolators_.at(animationName);
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
