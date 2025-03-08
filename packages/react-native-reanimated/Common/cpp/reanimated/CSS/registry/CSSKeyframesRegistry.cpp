#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated::css {

const CSSKeyframesConfig &CSSKeyframesRegistry::get(
    const std::string &animationName) const {
  const auto it = registry_.find(animationName);
  if (it == registry_.end()) {
    throw std::runtime_error(
        "[Reanimated] " + animationName +
        " not found in the keyframes registry.");
  }
  return it->second;
}

void CSSKeyframesRegistry::add(
    const std::string &animationName,
    CSSKeyframesConfig &&config) {
  registry_[animationName] = std::move(config);
}

void CSSKeyframesRegistry::remove(const std::string &animationName) {
  registry_.erase(animationName);
}

} // namespace reanimated::css
