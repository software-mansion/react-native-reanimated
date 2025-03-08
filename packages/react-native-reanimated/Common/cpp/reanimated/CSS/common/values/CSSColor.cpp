#include <folly/json.h>
#include <reanimated/CSS/common/values/CSSColor.h>

namespace reanimated::css {

CSSColor::CSSColor()
    : channels{0, 0, 0, 0}, colorType(ColorType::Transparent) {}

CSSColor::CSSColor(ColorType colorType)
    : channels{0, 0, 0, 0}, colorType(colorType) {}

CSSColor::CSSColor(const uint8_t r, const uint8_t g, const uint8_t b)
    : channels{r, g, b, 255}, colorType(ColorType::Rgba) {}

CSSColor::CSSColor(
    const uint8_t r,
    const uint8_t g,
    const uint8_t b,
    const uint8_t a)
    : channels{r, g, b, a}, colorType(ColorType::Rgba) {}

CSSColor::CSSColor(const ColorChannels &colorChannels)
    : channels{colorChannels[0], colorChannels[1], colorChannels[2], colorChannels[3]},
      colorType(ColorType::Rgba) {}

CSSColor::CSSColor(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : channels{0, 0, 0, 0}, colorType(ColorType::Transparent) {
  if (jsiValue.isNumber()) {
    double numberValue = jsiValue.asNumber();
    uint32_t color;
    if (numberValue < 0) {
      color = static_cast<int32_t>(numberValue);
    } else {
      color = static_cast<uint32_t>(numberValue);
    }
    channels[0] = (color >> 16) & 0xFF; // Red
    channels[1] = (color >> 8) & 0xFF; // Green
    channels[2] = color & 0xFF; // Blue
    channels[3] = (color >> 24) & 0xFF; // Alpha
    colorType = ColorType::Rgba;
  } else if (
      jsiValue.isUndefined() ||
      (jsiValue.isString() &&
       jsiValue.getString(rt).utf8(rt) == "transparent")) {
    colorType = ColorType::Transparent;
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSColor: Invalid value type: " +
        stringifyJSIValue(rt, jsiValue));
  }
}

CSSColor::CSSColor(const folly::dynamic &value)
    : channels{0, 0, 0, 0}, colorType(ColorType::Transparent) {
  if (value.isNumber()) {
    double numberValue = value.asDouble();
    uint32_t color;
    if (numberValue < 0) {
      color = static_cast<int32_t>(numberValue);
    } else {
      color = static_cast<uint32_t>(numberValue);
    }
    channels[0] = (color >> 16) & 0xFF; // Red
    channels[1] = (color >> 8) & 0xFF; // Green
    channels[2] = color & 0xFF; // Blue
    channels[3] = (color >> 24) & 0xFF; // Alpha
    colorType = ColorType::Rgba;
  } else if (
      value.empty() ||
      (value.isString() && value.getString() == "transparent")) {
    colorType = ColorType::Transparent;
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSColor: Invalid value type: " + folly::toJson(value));
  }
}

bool CSSColor::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  // TODO - improve canConstruct check and add check for string correctness
  return jsiValue.isNumber() || jsiValue.isString();
}

bool CSSColor::canConstruct(const folly::dynamic &value) {
  // TODO - improve canConstruct check and add check for string correctness
  return value.isNumber() || value.isString();
}

folly::dynamic CSSColor::toDynamic() const {
  if (colorType == ColorType::Transparent) {
    return 0x00000000;
  }
  return (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) |
      channels[2];
}

std::string CSSColor::toString() const {
  if (colorType == ColorType::Rgba) {
    return "rgba(" + std::to_string(channels[0]) + "," +
        std::to_string(channels[1]) + "," + std::to_string(channels[2]) + "," +
        std::to_string(channels[3]) + ")";
  } else {
    return "transparent";
  }
}

CSSColor CSSColor::interpolate(const double progress, const CSSColor &to)
    const {
  if (to.colorType == ColorType::Transparent &&
      colorType == ColorType::Transparent) {
    return *this;
  }

  ColorChannels fromChannels = channels;
  ColorChannels toChannels = to.channels;
  if (colorType == ColorType::Transparent) {
    fromChannels = {toChannels[0], toChannels[1], toChannels[2], 0};
  } else if (to.colorType == ColorType::Transparent) {
    toChannels = {fromChannels[0], fromChannels[1], fromChannels[2], 0};
  }

  ColorChannels resultChannels;
  for (size_t i = 0; i < 4; ++i) {
    resultChannels[i] =
        interpolateChannel(fromChannels[i], toChannels[i], progress);
  }

  return CSSColor(resultChannels);
}

uint8_t CSSColor::interpolateChannel(
    const uint8_t from,
    const uint8_t to,
    const double progress) {
  // Cast one of operands to double to avoid unsigned int subtraction overflow
  // (when from > to)
  double interpolated = (static_cast<double>(to) - from) * progress + from;
  return static_cast<uint8_t>(std::round(std::clamp(interpolated, 0.0, 255.0)));
}

bool CSSColor::operator==(const CSSColor &other) const {
  return colorType == other.colorType && channels[0] == other.channels[0] &&
      channels[1] == other.channels[1] && channels[2] == other.channels[2] &&
      channels[3] == other.channels[3];
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSColor &colorValue) {
  os << "CSSColor(" << colorValue.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
