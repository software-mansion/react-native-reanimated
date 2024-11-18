#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/NumberStepsInterpolator.h>

namespace reanimated {

int NumberStepsInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return static_cast<int>(value.asNumber());
}

jsi::Value NumberStepsInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const int &value) const {
  return {value};
}

int NumberStepsInterpolator::interpolate(
    const double localProgress,
    const int &fromValue,
    const int &toValue,
    const PropertyInterpolationUpdateContext &context) const {
  // TODO: Make sure it should work in this way for NumberStepsInterpolator
  int diff = toValue - fromValue;
  return fromValue + static_cast<int>(diff * localProgress);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
