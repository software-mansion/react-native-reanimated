#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

namespace reanimated {

RelativeOrNumericValueInterpolator::RelativeOrNumericValueInterpolator(
    TargetType relativeTo,
    const std::string &relativeProperty)
    : relativeTo(relativeTo), relativeProperty(relativeProperty) {}

double RelativeOrNumericValueInterpolator::convertValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return value.asNumber();
}

jsi::Value RelativeOrNumericValueInterpolator::convertToJSIValue(
    jsi::Runtime &rt,
    const double &value) const {
  return jsi::Value(value);
}

double RelativeOrNumericValueInterpolator::interpolate(
    double localProgress,
    const double &fromValue,
    const double &toValue) const {
  return fromValue + localProgress * (toValue - fromValue);
}

} // namespace reanimated
