#pragma once

#include <reanimated/CSS/ViewPropsRepository.h>
#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

class NumericValueInterpolator : public ValueInterpolator<double> {
 protected:
  double convertValue(jsi::Runtime &rt, const jsi::Value &value) const override;

  jsi::Value convertToJSIValue(jsi::Runtime &rt, const double &value)
      const override {
    return jsi::Value(value);
  }

  double interpolate(
      double localProgress,
      const double &fromValue,
      const double &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
