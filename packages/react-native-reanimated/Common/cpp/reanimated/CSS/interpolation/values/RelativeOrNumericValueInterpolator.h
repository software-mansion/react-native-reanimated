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
    : public ValueInterpolator<RelativeInterpolatorValue> {
 public:
  RelativeOrNumericValueInterpolator(
      TargetType relativeTo,
      const std::string &relativeProperty);

 protected:
  RelativeInterpolatorValue convertValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  jsi::Value convertToJSIValue(
      jsi::Runtime &rt,
      const RelativeInterpolatorValue &value) const override;

  RelativeInterpolatorValue interpolate(
      double localProgress,
      const RelativeInterpolatorValue &fromValue,
      const RelativeInterpolatorValue &toValue,
      const InterpolationUpdateContext context) const override;

 private:
  TargetType relativeTo;
  std::string relativeProperty;

  double getRelativeValue(const InterpolationUpdateContext context) const;
};

} // namespace reanimated
