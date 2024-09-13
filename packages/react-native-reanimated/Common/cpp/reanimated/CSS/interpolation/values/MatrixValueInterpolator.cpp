#include <reanimated/CSS/interpolation/values/MatrixValueInterpolator.h>

namespace reanimated {

std::vector<double> MatrixValueInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  throw std::runtime_error("[Reanimated] Not implemented");
}

jsi::Value MatrixValueInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const std::vector<double> &value) const {
  throw std::runtime_error("[Reanimated] Not implemented");
}

std::vector<double> MatrixValueInterpolator::interpolate(
    double localProgress,
    const std::vector<double> &fromValue,
    const std::vector<double> &toValue,
    const InterpolationUpdateContext context) const {
  throw std::runtime_error("[Reanimated] Not implemented");
}

} // namespace reanimated
