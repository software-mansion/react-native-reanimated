#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/values/DiscreteStringInterpolator.h>

namespace reanimated {

std::string DiscreteStringInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return value.asString(rt).utf8(rt);
}

jsi::Value DiscreteStringInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const std::string &value) const {
  return jsi::String::createFromUtf8(rt, value);
}

std::string DiscreteStringInterpolator::interpolate(
    const double progress,
    const std::string &fromValue,
    const std::string &toValue,
    const ValueInterpolatorUpdateContext &context) const {
  return progress < 0.5 ? fromValue : toValue;
}

std::string DisplayInterpolator::interpolate(
    const double progress,
    const std::string &fromValue,
    const std::string &toValue,
    const ValueInterpolatorUpdateContext &context) const {
  if (progress == 0 || toValue == "none") {
    return fromValue;
  }
  if (progress == 1 || fromValue == "none") {
    return toValue;
  }
  return DiscreteStringInterpolator::interpolate(
      progress, fromValue, toValue, context);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
