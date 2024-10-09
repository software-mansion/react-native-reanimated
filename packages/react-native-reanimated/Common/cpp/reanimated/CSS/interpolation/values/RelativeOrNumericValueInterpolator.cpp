#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    const TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : ValueInterpolator<RelativeOrNumericInterpolatorValue>(
          defaultValue,
          viewStylesRepository,
          propertyPath),
      relativeTo_(relativeTo),
      relativeProperty_(relativeProperty),
      viewStylesRepository_(viewStylesRepository) {};

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
  if (value.isRelative) {
    return jsi::String::createFromUtf8(
        rt, std::to_string(value.value * 100) + "%");
  }
  return jsi::Value(value.value);
}

RelativeOrNumericInterpolatorValue
RelativeOrNumericValueInterpolator::interpolate(
    const double localProgress,
    const RelativeOrNumericInterpolatorValue &fromValue,
    const RelativeOrNumericInterpolatorValue &toValue,
    const InterpolationUpdateContext context) const {
  if (localProgress == 0) {
    return fromValue;
  }
  if (localProgress == 1) {
    return toValue;
  }
  // If both value types are the same, we can interpolate without reading the
  // relative value from the shadow node
  if (fromValue.isRelative == toValue.isRelative) {
    return {
        fromValue.value + (toValue.value - fromValue.value) * localProgress,
        fromValue.isRelative};
  }
  // Otherwise, we need to read the relative value from the shadow node and
  // interpolate values as numbers
  double from = (fromValue.isRelative ? getRelativeValue(context.node) : 1) *
      fromValue.value;
  double to =
      (toValue.isRelative ? getRelativeValue(context.node) : 1) * toValue.value;
  return {from + (to - from) * localProgress, false};
}

double RelativeOrNumericValueInterpolator::getRelativeValue(
    const ShadowNode::Shared &shadowNode) const {
  jsi::Value relativeValue;

  if (relativeTo_ == TargetType::PARENT) {
    relativeValue =
        viewStylesRepository_->getParentNodeProp(shadowNode, relativeProperty_);
  } else {
    relativeValue =
        viewStylesRepository_->getNodeProp(shadowNode, relativeProperty_);
  }

  if (relativeValue.isUndefined()) {
    return 0;
  }

  return relativeValue.asNumber();
}

} // namespace reanimated
