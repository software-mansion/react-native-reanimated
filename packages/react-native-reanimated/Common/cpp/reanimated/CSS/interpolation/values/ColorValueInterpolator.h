#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

class ColorValueInterpolator final : public ValueInterpolator<Color> {
 public:
  using ValueInterpolator<Color>::ValueInterpolator;

 protected:
  Color prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const Color &value)
      const override;

  Color interpolate(
      double progress,
      const Color &fromValue,
      const Color &toValue,
      const ValueInterpolatorUpdateContext &context) const override;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
