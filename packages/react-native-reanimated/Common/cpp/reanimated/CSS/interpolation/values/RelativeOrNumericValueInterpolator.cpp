#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    TargetType relativeTo,
    const std::string &relativeProperty)
    : relativeTo(relativeTo), relativeProperty(relativeProperty) {}

RelativeInterpolatorValue
RelativeOrNumericValueInterpolator::prepareKeyframeValue(
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

jsi::Value RelativeOrNumericValueInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const double &value) const {
  return jsi::Value(value);
}

double RelativeOrNumericValueInterpolator::interpolateBetweenKeyframes(
    double localProgress,
    const double &from,
    const double &to,
    const InterpolationUpdateContext context) const {
  return from + (to - from) * localProgress;
}

double RelativeOrNumericValueInterpolator::resolveKeyframeValue(
    const InterpolationUpdateContext context,
    const RelativeInterpolatorValue &keyframeValue) const {
  if (!keyframeValue.isRelative) {
    return keyframeValue.value;
  }

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

  const auto percentage = keyframeValue.value;

  return percentage * relativeValue.asNumber();
}

} // namespace reanimated
