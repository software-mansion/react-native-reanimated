#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

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
      const PropertyPath &propertyPath,
      const std::optional<UnitValue> &defaultValue,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  UnitValue prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const UnitValue &value)
      const override;

  UnitValue interpolate(
      double progress,
      const UnitValue &fromValue,
      const UnitValue &toValue,
      const ValueInterpolatorUpdateContext &context) const override;

  bool isResolvable() const override;

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
