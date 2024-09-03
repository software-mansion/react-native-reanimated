#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <jsi/jsi.h>
#include <stdexcept>

namespace reanimated {

class ColorValueInterpolator : public ValueInterpolator<ColorArray> {
 protected:
  ColorArray convertValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertToJSIValue(jsi::Runtime &rt, const ColorArray &value)
      const override;

  ColorArray interpolate(
      double localProgress,
      const ColorArray &fromValue,
      const ColorArray &toValue,
      const InterpolationUpdateContext context) const override;

 private:
  double toLinearSpace(uint8_t value) const;
  uint8_t toGammaCorrectedSpace(double value) const;
};

} // namespace reanimated
