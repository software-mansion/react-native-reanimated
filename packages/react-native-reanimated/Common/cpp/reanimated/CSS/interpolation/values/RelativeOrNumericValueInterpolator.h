#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <memory>
#include <string>

namespace reanimated {

class RelativeOrNumericValueInterpolator final
    : public ValueInterpolator<UnitValue> {
 public:
  RelativeOrNumericValueInterpolator(
      RelativeTo relativeTo,
      std::string relativeProperty,
      const std::optional<UnitValue> &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

 protected:
  UnitValue prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const UnitValue &value)
      const override;

  UnitValue interpolate(
      double localProgress,
      const UnitValue &fromValue,
      const UnitValue &toValue,
      const PropertyInterpolationUpdateContext &context) const override;

  bool isResolvable() const override {
    return true;
  }

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
};

} // namespace reanimated
