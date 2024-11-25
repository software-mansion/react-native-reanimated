#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <memory>

namespace reanimated {

class TransformOriginInterpolator final
    : public ValueInterpolator<TransformOrigin> {
 public:
  TransformOriginInterpolator(
      const PropertyPath &propertyPath,
      const std::optional<TransformOrigin> &defaultValue,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  TransformOrigin prepareKeyframeValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const TransformOrigin &value)
      const override;

  TransformOrigin interpolate(
      double progress,
      const TransformOrigin &fromValue,
      const TransformOrigin &toValue,
      const ValueInterpolatorUpdateContext &context) const override;

  bool isResolvable() const override {
    return true;
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
