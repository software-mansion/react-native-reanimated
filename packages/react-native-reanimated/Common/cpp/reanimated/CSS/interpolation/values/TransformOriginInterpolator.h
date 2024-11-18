#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <memory>

namespace reanimated {

class TransformOriginInterpolator final
    : public ValueInterpolator<TransformOrigin> {
 public:
  TransformOriginInterpolator(
      const std::optional<TransformOrigin> &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

 protected:
  TransformOrigin prepareKeyframeValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const TransformOrigin &value)
      const override;

  TransformOrigin interpolate(
      double localProgress,
      const TransformOrigin &fromValue,
      const TransformOrigin &toValue,
      const PropertyInterpolationUpdateContext &context) const override;

  bool isResolvable() const override {
    return true;
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
