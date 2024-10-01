#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::vector<std::string> &propertyPath)
    : ValueInterpolator<RelativeOrNumericInterpolatorValue>(
          defaultValue,
          viewStylesRepository,
          propertyPath),
      relativeTo_(relativeTo),
      relativeProperty_(relativeProperty),
      viewPropsRepository_(viewStylesRepository) {};

double RelativeOrNumericValueInterpolator::percentageToNumber(
    const std::string &value) {
  std::string str = value;
  if (str.back() == '%') {
    str.pop_back();
    return std::stod(str) / 100;
  }
  throw std::runtime_error(
      "[Reanimated] RelativeOrNumericValueInterpolator: unsupported value: " +
      str);
}

RelativeOrNumericInterpolatorValue
RelativeOrNumericValueInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  // Numeric value
  if (value.isNumber()) {
    return {value.asNumber(), false};
  }
  // Relative value
  std::string str = value.asString(rt).utf8(rt);
  return {percentageToNumber(str), true};
}

jsi::Value RelativeOrNumericValueInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const RelativeOrNumericInterpolatorValue &value) const {
  return jsi::Value(value.value);
}

RelativeOrNumericInterpolatorValue
RelativeOrNumericValueInterpolator::interpolate(
    double localProgress,
    const RelativeOrNumericInterpolatorValue &fromValue,
    const RelativeOrNumericInterpolatorValue &toValue,
    const InterpolationUpdateContext context) const {
  double from =
      (fromValue.isRelative ? getRelativeValue(context) : 1) * fromValue.value;
  double to =
      (toValue.isRelative ? getRelativeValue(context) : 1) * toValue.value;

  return {from + (to - from) * localProgress, false};
}

double RelativeOrNumericValueInterpolator::getRelativeValue(
    const InterpolationUpdateContext context) const {
  jsi::Value relativeValue;

  if (relativeTo_ == TargetType::Parent) {
    relativeValue = viewPropsRepository_->getParentNodeProp(
        context.node, relativeProperty_);
  } else {
    relativeValue =
        viewPropsRepository_->getNodeProp(context.node, relativeProperty_);
  }

  if (relativeValue.isUndefined()) {
    return 0;
  }

  return relativeValue.asNumber();
}

} // namespace reanimated
