#pragma once

#include <reanimated/CSS/interpolation/properties/ValueInterpolator.h>

namespace reanimated {

class NumericValueInterpolator : public ValueInterpolator<double> {
 public:
  using ValueInterpolator<double>::ValueInterpolator;

 protected:
  double prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const double &value)
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
