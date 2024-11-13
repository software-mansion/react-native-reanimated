#include <reanimated/CSS/common/Color.h>

namespace reanimated {

Color::Color() : channels{0, 0, 0, 0}, type(ColorType::TRANSPARENT) {}

Color::Color(const ColorArray &colorArray)
    : channels{colorArray[0], colorArray[1], colorArray[2], colorArray[3]},
      type(ColorType::RGBA) {}

Color::Color(const uint8_t r, const uint8_t g, const uint8_t b, const uint8_t a)
    : channels{r, g, b, a}, type(ColorType::RGBA) {}

Color::Color(const uint8_t r, const uint8_t g, const uint8_t b)
    : channels{r, g, b, 255}, type(ColorType::RGBA) {}

Color::Color(jsi::Runtime &rt, const jsi::Value &value)
    : channels{0, 0, 0, 0}, type(ColorType::TRANSPARENT) {
  if (value.isNumber()) {
    const auto color = static_cast<unsigned>(value.asNumber());
    channels[0] = (color << 8) >> 24; // Red
    channels[1] = (color << 16) >> 24; // Green
    channels[2] = (color << 24) >> 24; // Blue
    channels[3] = color >> 24; // Alpha
    type = ColorType::RGBA;
  } else if (
      value.isUndefined() ||
      (value.isString() && value.getString(rt).utf8(rt) == "transparent")) {
    type = ColorType::TRANSPARENT;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid color value: " + stringifyJSIValue(rt, value));
  }
}

std::string Color::toString() const {
  if (type == ColorType::RGBA) {
    return "rgba(" + std::to_string(channels[0]) + "," +
        std::to_string(channels[1]) + "," + std::to_string(channels[2]) + "," +
        std::to_string(channels[3]) + ")";
  } else {
    return "transparent";
  }
}

jsi::Value Color::toJSIValue(jsi::Runtime &rt) const {
  if (type == ColorType::TRANSPARENT) {
    return 0x00000000;
  }

  return {
      (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) |
      channels[2]};
}

Color Color::interpolate(const Color &to, const double progress) const {
  if (to.type == ColorType::TRANSPARENT && type == ColorType::TRANSPARENT) {
    return *this;
  }

  ColorArray fromChannels = channels;
  ColorArray toChannels = to.channels;
  if (type == ColorType::TRANSPARENT) {
    fromChannels = {toChannels[0], toChannels[1], toChannels[2], 0};
  } else if (to.type == ColorType::TRANSPARENT) {
    toChannels = {fromChannels[0], fromChannels[1], fromChannels[2], 0};
  }

  ColorArray resultChannels;
  for (size_t i = 0; i < 4; ++i) {
    resultChannels[i] =
        interpolateChannel(fromChannels[i], toChannels[i], progress);
  }

  return Color(resultChannels);
}

uint8_t Color::interpolateChannel(
    const uint8_t from,
    const uint8_t to,
    const double progress) {
  // Cast one of operands to double to avoid unsigned int subtraction overflow
  // (when from > to)
  double interpolated = (static_cast<double>(to) - from) * progress + from;
  return static_cast<uint8_t>(std::round(std::clamp(interpolated, 0.0, 255.0)));
}

} // namespace reanimated
