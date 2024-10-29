#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>

namespace reanimated {

Color ColorValueInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return {rt, value};
}

jsi::Value ColorValueInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const Color &value) const {
  return value.toJSIValue(rt);
}

Color ColorValueInterpolator::interpolate(
    const double localProgress,
    const Color &fromValue,
    const Color &toValue,
    const PropertyInterpolationUpdateContext &context) const {
  return fromValue.interpolate(toValue, localProgress);
}

} // namespace reanimated
