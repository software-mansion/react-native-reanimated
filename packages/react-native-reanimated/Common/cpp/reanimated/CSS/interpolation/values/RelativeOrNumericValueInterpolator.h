#pragma once

#include <reanimated/CSS/ViewPropsRepository.h>
#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <jsi/jsi.h>
#include <string>

namespace reanimated {

enum class TargetType {
  Parent,
  Self,
};

class RelativeOrNumericValueInterpolator
    : public ValueInterpolator<RelativeInterpolatorValue, double> {
 public:
  RelativeOrNumericValueInterpolator(
      TargetType relativeTo,
      const std::string &relativeProperty);

 protected:
  RelativeInterpolatorValue prepareKeyframeValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const double &value)
      const override;

  double resolveKeyframeValue(
      const InterpolationUpdateContext context,
      const RelativeInterpolatorValue &value) const override;

  double interpolateBetweenKeyframes(
      double localProgress,
      const double &fromValue,
      const double &toValue,
      const InterpolationUpdateContext context) const override;

 private:
  TargetType relativeTo;
  std::string relativeProperty;
};

} // namespace reanimated
