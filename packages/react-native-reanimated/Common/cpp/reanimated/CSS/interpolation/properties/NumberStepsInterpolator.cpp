#include <reanimated/CSS/interpolation/properties/NumberStepsInterpolator.h>

namespace reanimated {

int NumberStepsInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return static_cast<int>(value.asNumber());
}

jsi::Value NumberStepsInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const int &value) const {
  return jsi::Value(value);
}

int NumberStepsInterpolator::interpolate(
    double localProgress,
    const int &fromValue,
    const int &toValue,
    const InterpolationUpdateContext context) const {
  // TODO: Make sure it should work in this way for NumberStepsInterpolator
  int diff = toValue - fromValue;
  return fromValue + static_cast<int>(diff * localProgress);
}

} // namespace reanimated
