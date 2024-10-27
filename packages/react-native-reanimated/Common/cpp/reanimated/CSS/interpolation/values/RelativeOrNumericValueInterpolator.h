#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

class RelativeOrNumericValueInterpolator : public ValueInterpolator<UnitValue> {
 public:
  RelativeOrNumericValueInterpolator(
      const RelativeTo relativeTo,
      const std::string &relativeProperty,
      const std::optional<UnitValue> &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

 protected:
  UnitValue prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const UnitValue &value)
      const override;

  UnitValue interpolate(
      const double localProgress,
      const UnitValue &fromValue,
      const UnitValue &toValue,
      const PropertyInterpolationUpdateContext context) const override;

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
};

} // namespace reanimated
