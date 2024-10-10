#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

namespace reanimated {

GroupInterpolator::GroupInterpolator(
    const PropertiesInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : Interpolator(propertyPath),
      factories_(factories),
      viewStylesRepository_(viewStylesRepository) {}

jsi::Value GroupInterpolator::getCurrentValue(jsi::Runtime &rt) const {
  return mapInterpolators(rt, [&](Interpolator &interpolator) {
    return interpolator.getCurrentValue(rt);
  });
}

jsi::Value GroupInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(rt, [&](Interpolator &interpolator) {
    return interpolator.getStyleValue(rt, shadowNode);
  });
}

jsi::Value GroupInterpolator::update(const InterpolationUpdateContext context) {
  return mapInterpolators(context.rt, [&](Interpolator &interpolator) {
    return interpolator.update(context);
  });
}

} // namespace reanimated
