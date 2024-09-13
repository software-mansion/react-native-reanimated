#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue)
    : ValueInterpolator<RelativeOrNumericInterpolatorValue>(defaultValue),
      relativeTo(relativeTo),
      relativeProperty(relativeProperty) {}

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
  auto &viewPropsRepository = ViewPropsRepository::getInstance();
  jsi::Value relativeValue;

  if (relativeTo == TargetType::Parent) {
    relativeValue = viewPropsRepository.getParentProp(
        context.rt, context.node, relativeProperty);
  } else {
    relativeValue =
        viewPropsRepository.getProp(context.rt, context.node, relativeProperty);
  }

  // We can get undefined if the parent of the current shadow node does
  // not exist. This usually happens when views are unmounted and parent
  // becomes inaccessible before the child animation is stopped.
  // (Finishing the animation when the componentWillUnmount is called
  // doesn't guarantee that the animation will finish before the parent
  // is unmounted).
  if (relativeValue.isUndefined()) {
    return 0;
  }

  return relativeValue.asNumber();
}

} // namespace reanimated
