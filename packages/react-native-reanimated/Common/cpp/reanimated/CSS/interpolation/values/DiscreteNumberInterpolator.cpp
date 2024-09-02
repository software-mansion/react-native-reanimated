#include <reanimated/CSS/interpolation/values/DiscreteNumberInterpolator.h>

namespace reanimated {

int DiscreteNumberInterpolator::convertValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return static_cast<int>(value.asNumber());
}

jsi::Value DiscreteNumberInterpolator::convertToJSIValue(
    jsi::Runtime &rt,
    const int &value) const {
  return jsi::Value(value);
}

int DiscreteNumberInterpolator::interpolate(
    double localProgress,
    const int &fromValue,
    const int &toValue) const {
  // TODO: Make sure it should work in this way for DiscreteNumberInterpolator
  int diff = toValue - fromValue;
  return fromValue + static_cast<int>(diff * localProgress);
}

} // namespace reanimated
