#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

namespace reanimated {

GroupInterpolator::GroupInterpolator(
    const std::vector<std::string> &propertyPath)
    : Interpolator(propertyPath) {}

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

} // namespace reanimated
