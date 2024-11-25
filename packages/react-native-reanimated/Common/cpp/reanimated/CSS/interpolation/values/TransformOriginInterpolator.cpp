#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/TransformOriginInterpolator.h>

namespace reanimated {

TransformOriginInterpolator::TransformOriginInterpolator(
    const PropertyPath &propertyPath,
    const std::optional<TransformOrigin> &defaultValue,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : ValueInterpolator<TransformOrigin>(
          propertyPath,
          defaultValue,
          progressProvider,
          viewStylesRepository) {}

TransformOrigin TransformOriginInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return TransformOrigin(rt, value);
}

jsi::Value TransformOriginInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const TransformOrigin &value) const {
  return jsi::Array::createWithElements(
      rt,
      value.x.toJSIValue(rt),
      value.y.toJSIValue(rt),
      value.z.toJSIValue(rt));
}

TransformOrigin TransformOriginInterpolator::interpolate(
    const double progress,
    const TransformOrigin &fromValue,
    const TransformOrigin &toValue,
    const ValueInterpolatorUpdateContext &context) const {
  return TransformOrigin(
      fromValue.x.interpolate(
          progress,
          toValue.x,
          {
              .node = context.node,
              .viewStylesRepository = viewStylesRepository_,
              .relativeProperty = "width",
              .relativeTo = RelativeTo::SELF,
          }),
      fromValue.y.interpolate(
          progress,
          toValue.y,
          {
              .node = context.node,
              .viewStylesRepository = viewStylesRepository_,
              .relativeProperty = "height",
              .relativeTo = RelativeTo::SELF,
          }),
      UnitValue(
          fromValue.z.value +
          (toValue.z.value - fromValue.z.value) * progress));
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
