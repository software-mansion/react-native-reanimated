#include <reanimated/CSS/interpolation/values/DiscreteStringInterpolator.h>

namespace reanimated {

std::string DiscreteStringInterpolator::convertValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return value.asString(rt).utf8(rt);
}

jsi::Value DiscreteStringInterpolator::convertToJSIValue(
    jsi::Runtime &rt,
    const std::string &value) const {
  return jsi::String::createFromUtf8(rt, value);
}

std::string DiscreteStringInterpolator::interpolate(
    double localProgress,
    const std::string &fromValue,
    const std::string &toValue) const {
  return localProgress < 0.5 ? fromValue : toValue;
}

} // namespace reanimated
