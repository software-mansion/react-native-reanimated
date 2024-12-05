#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

#include <utility>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    RelativeTo relativeTo,
    std::string relativeProperty,
    const PropertyPath &propertyPath,
    const std::optional<UnitValue> &defaultValue,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : ValueInterpolator<UnitValue>(
          propertyPath,
          defaultValue,
          progressProvider,
          viewStylesRepository),
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
    const double progress,
    const UnitValue &fromValue,
    const UnitValue &toValue,
    const ValueInterpolatorUpdateContext &context) const {
  return fromValue.interpolate(
      progress,
      toValue,
      {
          .node = context.node,
          .viewStylesRepository = viewStylesRepository_,
          .relativeProperty = relativeProperty_,
          .relativeTo = relativeTo_,
      });
}

bool RelativeOrNumericValueInterpolator::isResolvable() const {
  return true;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
