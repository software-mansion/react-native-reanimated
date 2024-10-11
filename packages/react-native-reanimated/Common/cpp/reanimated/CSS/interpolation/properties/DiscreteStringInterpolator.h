#pragma once

#include <reanimated/CSS/interpolation/properties/ValueInterpolator.h>

namespace reanimated {

class DiscreteStringInterpolator : public ValueInterpolator<std::string> {
 public:
  using ValueInterpolator<std::string>::ValueInterpolator;

 protected:
  std::string prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const std::string &value)
      const override;

  std::string interpolate(
      double localProgress,
      const std::string &fromValue,
      const std::string &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
