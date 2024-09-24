#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>
#include <reanimated/CSS/misc/ViewPropsRepository.h>

#include <string>

namespace reanimated {

enum class TargetType {
  Parent,
  Self,
};

class RelativeOrNumericValueInterpolator
    : public ValueInterpolator<RelativeOrNumericInterpolatorValue> {
 public:
  RelativeOrNumericValueInterpolator(
      TargetType relativeTo,
      const std::string &relativeProperty,
      const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue);

  static double percentageToNumber(const std::string &value);

 protected:
  RelativeOrNumericInterpolatorValue prepareKeyframeValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  jsi::Value convertResultToJSI(
      jsi::Runtime &rt,
      const RelativeOrNumericInterpolatorValue &value) const override;

  RelativeOrNumericInterpolatorValue interpolate(
      double localProgress,
      const RelativeOrNumericInterpolatorValue &fromValue,
      const RelativeOrNumericInterpolatorValue &toValue,
      const InterpolationUpdateContext context) const override;

 private:
  TargetType relativeTo;
  std::string relativeProperty;

  double getRelativeValue(const InterpolationUpdateContext context) const;
};

} // namespace reanimated
