#pragma once

#include <reanimated/CSS/interpolation/properties/ValueInterpolator.h>

namespace reanimated {

class NumberStepsInterpolator : public ValueInterpolator<int> {
 public:
  using ValueInterpolator<int>::ValueInterpolator;

 protected:
  int prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const int &value)
      const override;

  int interpolate(
      double localProgress,
      const int &fromValue,
      const int &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
