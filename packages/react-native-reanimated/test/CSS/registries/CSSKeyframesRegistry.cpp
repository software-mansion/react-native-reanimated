#include <reanimated/CSS/registries/CSSKeyframesRegistry.h>

namespace reanimated::css {

CSSKeyframesRegistry::CSSKeyframesRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

const CSSKeyframesConfig &CSSKeyframesRegistry::get(
    const std::string &animationName,
    const std::string &componentName) {
  const auto &registryIt = registry_.find(animationName);
  if (registryIt == registry_.end()) {
    throw std::runtime_error(
        "[Reanimated] No keyframes with name `" + animationName +
        "` were registered");
  }

  const auto &keyframesByComponentName = registryIt->second;
  const auto &keyframesByComponentNameIt =
      keyframesByComponentName.find(componentName);
  if (keyframesByComponentNameIt == keyframesByComponentName.end()) {
    throw std::runtime_error(
        "[Reanimated] No keyframes with name `" + animationName +
        "` were registered for component `" + componentName + "`");
  }

  return keyframesByComponentNameIt->second;
}

void CSSKeyframesRegistry::set(
    const std::string &animationName,
    const std::string &componentName,
    CSSKeyframesConfig &&config) {
  registry_[animationName][componentName] = std::move(config);
}

void CSSKeyframesRegistry::remove(
    const std::string &animationName,
    const std::string &componentName) {
  registry_[animationName].erase(componentName);
  if (registry_[animationName].empty()) {
    registry_.erase(animationName);
  }
}

} // namespace reanimated::css
