#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>

namespace reanimated {

GroupPropertiesInterpolator::GroupPropertiesInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(propertyPath, viewStylesRepository) {}

jsi::Value GroupPropertiesInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getStyleValue(rt, shadowNode);
      });
}

jsi::Value GroupPropertiesInterpolator::getFirstKeyframeValue(
    jsi::Runtime &rt) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getFirstKeyframeValue(rt);
      });
}

jsi::Value GroupPropertiesInterpolator::getLastKeyframeValue(
    jsi::Runtime &rt) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.getLastKeyframeValue(rt);
      });
}

jsi::Value GroupPropertiesInterpolator::interpolate(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  return mapInterpolators(
      rt, [&](PropertyInterpolator &interpolator) -> jsi::Value {
        return interpolator.interpolate(rt, shadowNode, progressProvider);
      });
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
