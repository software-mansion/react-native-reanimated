#include <reanimated/CSS/interpolation/values/DiscreteNumberInterpolator.h>

namespace reanimated {

int DiscreteNumberInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return static_cast<int>(value.asNumber());
}

jsi::Value DiscreteNumberInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const int &value) const {
  return jsi::Value(value);
}

int DiscreteNumberInterpolator::interpolateBetweenKeyframes(
    double localProgress,
    const int &fromValue,
    const int &toValue,
    const InterpolationUpdateContext context) const {
  // TODO: Make sure it should work in this way for DiscreteNumberInterpolator
  int diff = toValue - fromValue;
  return fromValue + static_cast<int>(diff * localProgress);
}

} // namespace reanimated
