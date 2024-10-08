#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

enum class TargetType {
  PARENT,
  SELF,
};

class RelativeOrNumericValueInterpolator
    : public ValueInterpolator<RelativeOrNumericInterpolatorValue> {
 public:
  RelativeOrNumericValueInterpolator(
      const TargetType relativeTo,
      const std::string &relativeProperty,
      const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::vector<std::string> &propertyPath);

  static double percentageToNumber(const std::string &value);

 protected:
  RelativeOrNumericInterpolatorValue prepareKeyframeValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  jsi::Value convertResultToJSI(
      jsi::Runtime &rt,
      const RelativeOrNumericInterpolatorValue &value) const override;

  RelativeOrNumericInterpolatorValue interpolate(
      const double localProgress,
      const RelativeOrNumericInterpolatorValue &fromValue,
      const RelativeOrNumericInterpolatorValue &toValue,
      const InterpolationUpdateContext context) const override;

 private:
  const TargetType relativeTo_;
  const std::string relativeProperty_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  double getRelativeValue(const ShadowNode::Shared &shadowNode) const;
};

} // namespace reanimated
