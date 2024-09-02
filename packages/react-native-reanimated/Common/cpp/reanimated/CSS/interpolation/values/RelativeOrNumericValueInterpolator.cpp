#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    TargetType relativeTo,
    const std::string &relativeProperty)
    : relativeTo(relativeTo), relativeProperty(relativeProperty) {}

RelativeInterpolatorValue RelativeOrNumericValueInterpolator::convertValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  // Numeric value
  if (value.isNumber()) {
    return {value.asNumber(), false};
  }
  // Relative value
  std::string str = value.asString(rt).utf8(rt);
  if (str.back() == '%') {
    str.pop_back();
    return {std::stod(str) / 100, true};
  }
  throw std::runtime_error(
      "[Reanimated] RelativeOrNumericValueInterpolator: unsupported value: " +
      str);
}

jsi::Value RelativeOrNumericValueInterpolator::convertToJSIValue(
    jsi::Runtime &rt,
    const RelativeInterpolatorValue &value) const {
  return jsi::Value(value.value);
}

RelativeInterpolatorValue RelativeOrNumericValueInterpolator::interpolate(
    double localProgress,
    const RelativeInterpolatorValue &fromValue,
    const RelativeInterpolatorValue &toValue,
    const InterpolationUpdateContext context) const {
  double from =
      (fromValue.isRelative ? getRelativeValue(context) : 1) * fromValue.value;
  double to =
      (toValue.isRelative ? getRelativeValue(context) : 1) * toValue.value;

  LOG(INFO) << "Interpolating from " << from << " to " << to
            << " with localProgress " << localProgress;

  return {from + (to - from) * localProgress, false};
}

double RelativeOrNumericValueInterpolator::getRelativeValue(
    const InterpolationUpdateContext context) const {
  auto &viewPropsRepository = ViewPropsRepository::getInstance();
  jsi::Value relativeValue;

  if (relativeTo == TargetType::Parent) {
    relativeValue = viewPropsRepository.getParentProp(
        context.rt, context.node, relativeProperty);
  } else {
    relativeValue =
        viewPropsRepository.getProp(context.rt, context.node, relativeProperty);
  }

  return relativeValue.asNumber();
}

} // namespace reanimated
