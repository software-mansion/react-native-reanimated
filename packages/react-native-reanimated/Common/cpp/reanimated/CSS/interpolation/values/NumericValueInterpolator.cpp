#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>

namespace reanimated {

double NumericValueInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return value.asNumber();
}

double NumericValueInterpolator::interpolate(
    const double progress,
    const double &fromValue,
    const double &toValue,
    const ValueInterpolatorUpdateContext &context) const {
  return fromValue + progress * (toValue - fromValue);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
