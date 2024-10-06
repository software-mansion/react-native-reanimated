#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

namespace reanimated {

GroupInterpolator::GroupInterpolator(
    const PropertiesInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::vector<std::string> &propertyPath)
    : factories_(factories),
      viewStylesRepository_(viewStylesRepository),
      Interpolator(propertyPath) {}

jsi::Value GroupInterpolator::update(const InterpolationUpdateContext context) {
  return mapInterpolators(context.rt, [&](Interpolator &interpolator) {
    return interpolator.update(context);
  });
}

jsi::Value GroupInterpolator::getBackwardsFillValue(jsi::Runtime &rt) const {
  return mapInterpolators(rt, [&](Interpolator &interpolator) {
    return interpolator.getBackwardsFillValue(rt);
  });
}

jsi::Value GroupInterpolator::getForwardsFillValue(jsi::Runtime &rt) const {
  return mapInterpolators(rt, [&](Interpolator &interpolator) {
    return interpolator.getForwardsFillValue(rt);
  });
}

jsi::Value GroupInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(rt, [&](Interpolator &interpolator) {
    return interpolator.getStyleValue(rt, shadowNode);
  });
}

void GroupInterpolator::addOrUpdateInterpolator(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::string &propertyName,
    const jsi::Value &keyframes) {
  if (interpolators_.find(propertyName) == interpolators_.cend()) {
    auto factory = factories_.find(propertyName);
    if (factory == factories_.cend()) {
      throw std::invalid_argument(
          "[Reanimated] No interpolator factory found for property: " +
          propertyName);
    }

    std::vector<std::string> newPath = propertyPath_;
    newPath.emplace_back(propertyName);
    interpolators_.emplace(
        propertyName, factory->second(viewStylesRepository_, newPath));
  }

  interpolators_.at(propertyName)->updateKeyframes(rt, shadowNode, keyframes);
}

} // namespace reanimated
