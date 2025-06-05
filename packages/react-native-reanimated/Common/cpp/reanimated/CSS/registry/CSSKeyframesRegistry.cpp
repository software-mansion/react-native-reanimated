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

bool CSSKeyframesRegistry::has(const std::string &animationName) const {
  return registry_.find(animationName) != registry_.end();
}

void CSSKeyframesRegistry::add(
    const std::string &animationName,
    CSSKeyframesConfig &&config) {
  registry_[animationName] = std::move(config);
}

// TODO - add proper keyframes cleanup mechanism in the new CSS animations
// implementation
void CSSKeyframesRegistry::remove(const std::string &animationName) {
  registry_.erase(animationName);
}

} // namespace reanimated::css
