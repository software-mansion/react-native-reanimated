#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>

namespace reanimated {

ColorValueInterpolator::ColorValueInterpolator(
    const std::optional<ColorArray> &defaultValue)
    : ValueInterpolator<ColorArray>(defaultValue) {}

ColorArray ColorValueInterpolator::toColorArray(unsigned color) {
  ColorArray channels;
  channels[0] = (color << 8) >> 24; // Red
  channels[1] = (color << 16) >> 24; // Green
  channels[2] = (color << 24) >> 24; // Blue
  channels[3] = color >> 24; // Alpha
  return channels;
}

ColorArray ColorValueInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  // We receive colors as decimals made from AARRGGBB format hexes
  unsigned color = static_cast<unsigned>(value.asNumber());
  return toColorArray(color);
}

jsi::Value ColorValueInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const ColorArray &value) const {
  double color =
      (value[3] << 24) | (value[0] << 16) | (value[1] << 8) | value[2];
  return jsi::Value(color);
}

ColorArray ColorValueInterpolator::interpolate(
    double localProgress,
    const ColorArray &fromValue,
    const ColorArray &toValue,
    const InterpolationUpdateContext context) const {
  ColorArray resultChannels;
  // interpolate rgb channels linear to progress
  for (int i = 0; i < 4; i++) {
    resultChannels[i] =
        (toValue[i] - fromValue[i]) * localProgress + fromValue[i];
  }
  return resultChannels;
}

} // namespace reanimated
