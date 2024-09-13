#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <jsi/jsi.h>
#include <string>

namespace reanimated {

class DiscreteStringInterpolator : public ValueInterpolator<std::string> {
 protected:
  std::string prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const std::string &value)
      const override;

  std::string interpolateBetweenKeyframes(
      double localProgress,
      const std::string &fromValue,
      const std::string &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
