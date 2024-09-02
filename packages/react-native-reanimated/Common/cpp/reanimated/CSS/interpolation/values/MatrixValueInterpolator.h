#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <jsi/jsi.h>
#include <stdexcept>
#include <vector>

namespace reanimated {

class MatrixValueInterpolator : public ValueInterpolator<std::vector<double>> {
 protected:
  std::vector<double> convertValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertToJSIValue(
      jsi::Runtime &rt,
      const std::vector<double> &value) const override;

  std::vector<double> interpolate(
      double localProgress,
      const std::vector<double> &fromValue,
      const std::vector<double> &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
