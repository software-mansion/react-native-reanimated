#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

class NumericValueInterpolator : public ValueInterpolator<double> {
 protected:
  double convertValue(jsi::Runtime &rt, const jsi::Value &value) const override;

  double interpolate(
      double localProgress,
      const double &fromValue,
      const double &toValue) const override;
};

} // namespace reanimated
