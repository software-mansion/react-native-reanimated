#include <reanimated/CSS/registries/CSSKeyframesRegistry.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSKeyframesRegistry::CSSKeyframesRegistry(const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

const CSSKeyframesConfig &CSSKeyframesRegistry::get(
    const std::string &animationName,
    const std::string &nativeComponentName) {
  const auto &registryIt = registry_.find(animationName);
  if (registryIt == registry_.end()) {
    throw std::runtime_error("[Reanimated] No keyframes with name `" + animationName + "` were registered");
  }

  const auto &keyframesByComponentName = registryIt->second;
  const auto &keyframesByComponentNameIt = keyframesByComponentName.find(nativeComponentName);
  if (keyframesByComponentNameIt == keyframesByComponentName.end()) {
    throw std::runtime_error(
        "[Reanimated] No keyframes with name `" + animationName + "` were registered for component `" +
        nativeComponentName + "`");
  }

  return keyframesByComponentNameIt->second;
}

void CSSKeyframesRegistry::set(
    const std::string &animationName,
    const std::string &nativeComponentName,
    CSSKeyframesConfig &&config) {
  registry_[animationName][nativeComponentName] = std::move(config);
}

void CSSKeyframesRegistry::remove(const std::string &animationName, const std::string &nativeComponentName) {
  registry_[animationName].erase(nativeComponentName);
  if (registry_[animationName].empty()) {
    registry_.erase(animationName);
  }
}

} // namespace reanimated::css
