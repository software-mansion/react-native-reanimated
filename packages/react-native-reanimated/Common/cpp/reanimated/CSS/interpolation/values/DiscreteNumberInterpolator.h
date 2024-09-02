#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <jsi/jsi.h>

namespace reanimated {

class DiscreteNumberInterpolator : public ValueInterpolator<int> {
 protected:
  int convertValue(jsi::Runtime &rt, const jsi::Value &value) const override;

  jsi::Value convertToJSIValue(jsi::Runtime &rt, const int &value)
      const override;

  int interpolate(
      double localProgress,
      const int &fromValue,
      const int &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
