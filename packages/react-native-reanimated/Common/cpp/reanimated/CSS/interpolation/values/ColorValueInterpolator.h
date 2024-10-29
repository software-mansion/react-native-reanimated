#pragma once

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
      double localProgress,
      const Color &fromValue,
      const Color &toValue,
      const PropertyInterpolationUpdateContext &context) const override;
};

} // namespace reanimated
