#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <jsi/jsi.h>
#include <string>

namespace reanimated {

enum class TargetType {
  Parent,
  Self,
};

class RelativeOrNumericValueInterpolator : public ValueInterpolator<double> {
 public:
  RelativeOrNumericValueInterpolator(
      TargetType relativeTo,
      const std::string &relativeProperty);

 protected:
  double convertValue(jsi::Runtime &rt, const jsi::Value &value) const override;

  jsi::Value convertToJSIValue(jsi::Runtime &rt, const double &value)
      const override;

  double interpolate(
      double localProgress,
      const double &fromValue,
      const double &toValue) const override;

 private:
  TargetType relativeTo;
  std::string relativeProperty;
};

} // namespace reanimated
