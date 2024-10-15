#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

namespace reanimated {

class ColorValueInterpolator : public ValueInterpolator<ColorArray> {
 public:
  using ValueInterpolator<ColorArray>::ValueInterpolator;

  static ColorArray toColorArray(unsigned color);

 protected:
  ColorArray prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const ColorArray &value)
      const override;

  ColorArray interpolate(
      double localProgress,
      const ColorArray &fromValue,
      const ColorArray &toValue,
      const InterpolationUpdateContext context) const override;
};

} // namespace reanimated
