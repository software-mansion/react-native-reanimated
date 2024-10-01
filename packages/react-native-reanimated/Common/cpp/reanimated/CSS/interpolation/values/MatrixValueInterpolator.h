#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

class MatrixValueInterpolator : public ValueInterpolator<std::vector<double>> {
 public:
  using ValueInterpolator<std::vector<double>>::ValueInterpolator;

 protected:
  std::vector<double> prepareKeyframeValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  jsi::Value convertResultToJSI(
      jsi::Runtime &rt,
      const std::vector<double> &value) const override;

  std::vector<double> interpolate(
      double localProgress,
      const std::vector<double> &fromValue,
      const std::vector<double> &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
