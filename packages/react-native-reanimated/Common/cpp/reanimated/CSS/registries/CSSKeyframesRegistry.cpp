#include <reanimated/CSS/registries/CSSKeyframesRegistry.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

CSSKeyframesRegistry::CSSKeyframesRegistry(const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

std::optional<std::reference_wrapper<const CSSKeyframesConfig>> CSSKeyframesRegistry::get(
    const std::string &animationName,
    const std::string &compoundComponentKey) {
  const auto registryIt = registry_.find(animationName);
  if (registryIt == registry_.end()) {
    return std::nullopt;
  }

  const auto &keyframesByComponent = registryIt->second;
  const auto keyframesByComponentIt = keyframesByComponent.find(compoundComponentKey);
  if (keyframesByComponentIt == keyframesByComponent.end()) {
    return std::nullopt;
  }

  return std::cref(keyframesByComponentIt->second);
}

void CSSKeyframesRegistry::set(
    const std::string &animationName,
    const std::string &compoundComponentKey,
    CSSKeyframesConfig &&config) {
  registry_[animationName][compoundComponentKey] = std::move(config);
}

void CSSKeyframesRegistry::remove(const std::string &animationName, const std::string &compoundComponentKey) {
  registry_[animationName].erase(compoundComponentKey);
  if (registry_[animationName].empty()) {
    registry_.erase(animationName);
  }
}

} // namespace reanimated::css
