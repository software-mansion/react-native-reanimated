#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

#include <utility>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    RelativeTo relativeTo,
    std::string relativeProperty,
    const std::optional<UnitValue> &defaultValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : ValueInterpolator<UnitValue>(
          defaultValue,
          viewStylesRepository,
          propertyPath),
      relativeTo_(relativeTo),
      relativeProperty_(std::move(relativeProperty)) {}

UnitValue RelativeOrNumericValueInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return UnitValue(rt, value);
}

jsi::Value RelativeOrNumericValueInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const UnitValue &value) const {
  return value.toJSIValue(rt);
}

UnitValue RelativeOrNumericValueInterpolator::interpolate(
    const double localProgress,
    const UnitValue &fromValue,
    const UnitValue &toValue,
    const PropertyInterpolationUpdateContext &context) const {
  return fromValue.interpolate(
      localProgress,
      toValue,
      {
          .node = context.node,
          .viewStylesRepository = viewStylesRepository_,
          .relativeProperty = relativeProperty_,
          .relativeTo = relativeTo_,
      });
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
