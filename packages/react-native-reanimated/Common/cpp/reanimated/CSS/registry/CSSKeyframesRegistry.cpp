#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated::css {

CSSKeyframesRegistry::CSSKeyframesRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

const std::shared_ptr<AnimationStyleInterpolator>
CSSKeyframesRegistry::getOrCreateInterpolator(
    const std::string &animationName,
    const std::string &componentName) {
  const auto &interpolatorsIt = styleInterpolators_.find(animationName);
  if (interpolatorsIt == styleInterpolators_.end()) {
    // If there is an animation with this name, there always should be
    // a map with interpolators (either empty if no interpolator was created
    // yet or non-empty if at least one interpolator was created)
    return nullptr;
  }

  if (interpolatorsIt->second.find(componentName) ==
      interpolatorsIt->second.end()) {
    // If there is no interpolator for this component type, create one
    const auto interpolator = std::make_shared<AnimationStyleInterpolator>(
        keyframeDefinitions_[animationName],
        componentName,
        viewStylesRepository_);
    interpolatorsIt->second[componentName] = interpolator;
  }

  return interpolatorsIt->second[componentName];
}

const std::shared_ptr<KeyframeEasingFunctions>
CSSKeyframesRegistry::getKeyframeEasingFunctions(
    const std::string &animationName) {
  return keyframeEasingFunctions_[animationName];
}

void CSSKeyframesRegistry::set(
    const std::string &animationName,
    CSSKeyframesConfig &&config) {
  keyframeDefinitions_[animationName] = std::move(config.keyframes);
  keyframeEasingFunctions_[animationName] =
      std::move(config.keyframeEasingFunctions);
  styleInterpolators_[animationName] = StyleInterpolatorsByComponentName();
}

void CSSKeyframesRegistry::remove(const std::string &animationName) {
  keyframeDefinitions_.erase(animationName);
  keyframeEasingFunctions_.erase(animationName);
  styleInterpolators_.erase(animationName);
}

} // namespace reanimated::css
