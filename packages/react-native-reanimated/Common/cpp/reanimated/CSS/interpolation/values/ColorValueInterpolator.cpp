#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>

namespace reanimated {

ColorArray ColorValueInterpolator::convertValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  // We receive colors as decimals made from AARRGGBB format hexes
  unsigned color = static_cast<unsigned>(value.asNumber());
  ColorArray channels;
  channels[0] = (color << 8) >> 24; // Red
  channels[1] = (color << 16) >> 24; // Green
  channels[2] = (color << 24) >> 24; // Blue
  channels[3] = color >> 24; // Alpha
  return channels;
}

jsi::Value ColorValueInterpolator::convertToJSIValue(
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

  // interpolate rgb cahnnels using gamma correction and alpha channel without
  // it
  for (int i = 0; i < 4; i++) {
    double fromChannelValue =
        i == 3 ? fromValue[i] : toLinearSpace(fromValue[i]);
    double toChannelValue = i == 3 ? toValue[i] : toLinearSpace(toValue[i]);
    double interpolatedValue =
        (toChannelValue - fromChannelValue) * localProgress + fromChannelValue;
    resultChannels[i] =
        i == 3 ? interpolatedValue : toGammaCorrectedSpace(interpolatedValue);
  }

  return resultChannels;
}

double ColorValueInterpolator::toLinearSpace(uint8_t value) const {
  double normalized = double(value) / 255.0;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  } else {
    return std::pow((normalized + 0.055) / 1.055, 2.4);
  }
}

uint8_t ColorValueInterpolator::toGammaCorrectedSpace(double value) const {
  if (value <= 0.0031308) {
    value = 12.92 * value;
  } else {
    value = 1.055 * std::pow(value, 1.0 / 2.4) - 0.055;
  }
  return value * 255.0 + 0.5;
}

} // namespace reanimated
