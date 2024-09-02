#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>

namespace reanimated {

int ColorValueInterpolator::convertValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  throw std::runtime_error("[Reanimated] Not implemented");
}

jsi::Value ColorValueInterpolator::convertToJSIValue(
    jsi::Runtime &rt,
    const int &value) const {
  throw std::runtime_error("[Reanimated] Not implemented");
}

int ColorValueInterpolator::interpolate(
    double localProgress,
    const int &fromValue,
    const int &toValue,
    const InterpolationUpdateContext context) const {
  throw std::runtime_error("[Reanimated] Not implemented");
}

} // namespace reanimated
