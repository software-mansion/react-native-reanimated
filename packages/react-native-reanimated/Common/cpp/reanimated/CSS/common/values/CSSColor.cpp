#include <reanimated/CSS/common/values/CSSColor.h>

namespace reanimated::css {

CSSColor::CSSColor()
    : channels{0, 0, 0, 0}, colorType(ColorType::Transparent) {}

CSSColor::CSSColor(ColorType colorType)
    : channels{0, 0, 0, 0}, colorType(colorType) {}

CSSColor::CSSColor(int64_t numberValue)
    : channels{0, 0, 0, 0}, colorType(ColorType::Rgba) {
  uint32_t color;
  // On Android, colors are represented as signed 32-bit integers. In JS, we use
  // a bitwise operation (normalizedColor = normalizedColor | 0x0) to ensure the
  // value is treated as a signed int, causing numbers above 2^31 to become
  // negative. To correctly interpret these in C++, we cast negative values to
  // int32_t to preserve their bit pattern, then assign to uint32_t. This wraps
  // the bits (modulo 2^32), effectively reversing the JS-side bit shift.
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
}

CSSColor::CSSColor(const std::string &colorString)
    : channels{0, 0, 0, 0}, colorType(ColorType::Transparent) {
  if (colorString == "transparent") {
    colorType = ColorType::Transparent;
  } else if (colorString == "currentColor") {
    colorType = ColorType::CurrentColor;
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSColor: Invalid string value: " + colorString);
  }
}

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
    *this = CSSColor(jsiValue.getNumber());
  } else if (jsiValue.isString()) {
    *this = CSSColor(jsiValue.getString(rt).utf8(rt));
  } else if (jsiValue.isUndefined()) {
    *this = Transparent;
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSColor: Invalid value: " +
        stringifyJSIValue(rt, jsiValue));
  }
}

CSSColor::CSSColor(const folly::dynamic &value)
    : channels{0, 0, 0, 0}, colorType(ColorType::Transparent) {
  if (value.isNumber()) {
    *this = CSSColor(value.asInt());
  } else if (value.isString()) {
    *this = CSSColor(value.getString());
  } else if (value.empty()) {
    *this = Transparent;
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSColor: Invalid value: " + folly::toJson(value));
  }
}

bool CSSColor::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isNumber() || jsiValue.isUndefined() ||
      (jsiValue.isString() &&
       isValidColorString(jsiValue.getString(rt).utf8(rt)));
}

bool CSSColor::canConstruct(const folly::dynamic &value) {
  return value.isNumber() || value.empty() ||
      (value.isString() && isValidColorString(value.getString()));
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
  }
  if (colorType == ColorType::CurrentColor) {
    return "currentColor";
  }
  return "transparent";
}

CSSColor CSSColor::interpolate(const double progress, const CSSColor &to)
    const {
  if ((to.colorType == ColorType::Transparent &&
       colorType == ColorType::Transparent) ||
      colorType == ColorType::CurrentColor ||
      to.colorType == ColorType::CurrentColor) {
    return progress < 0.5 ? *this : to;
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

bool CSSColor::isValidColorString(const std::string &colorString) {
  return colorString == "transparent" || colorString == "currentColor";
}

} // namespace reanimated::css
