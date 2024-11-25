#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>

namespace reanimated {

Color ColorValueInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return Color(rt, value);
}

jsi::Value ColorValueInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const Color &value) const {
  return value.toJSIValue(rt);
}

Color ColorValueInterpolator::interpolate(
    const double progress,
    const Color &fromValue,
    const Color &toValue,
    const ValueInterpolatorUpdateContext &context) const {
  return fromValue.interpolate(toValue, progress);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
