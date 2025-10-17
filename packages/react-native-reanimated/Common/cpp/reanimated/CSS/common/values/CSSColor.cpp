#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/svg/values/SVGBrush.h>

namespace reanimated::css {

// CSSColorBase template implementations

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase()
    : channels{0, 0, 0, 0}, colorType(TColorType::Transparent) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(TColorType colorType)
    : channels{0, 0, 0, 0}, colorType(colorType) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(int64_t numberValue)
    : channels{0, 0, 0, 0}, colorType(TColorType::Rgba) {
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
  colorType = TColorType::Rgba;
}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(
    const uint8_t r,
    const uint8_t g,
    const uint8_t b,
    const uint8_t a)
    : channels{r, g, b, a}, colorType(TColorType::Rgba) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(ColorChannels colorChannels)
    : channels{std::move(colorChannels)}, colorType(TColorType::Rgba) {}

template <ColorTypeEnum TColorType, typename TDerived>
bool CSSColorBase<TColorType, TDerived>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  if (!jsiValue.isObject()) {
    return false;
  }
  const auto &jsiObject = jsiValue.asObject(rt);
  return jsiObject.hasProperty(rt, "colorType");
}

template <ColorTypeEnum TColorType, typename TDerived>
bool CSSColorBase<TColorType, TDerived>::canConstruct(
    const folly::dynamic &value) {
  return value.isObject() && value.count("colorType") > 0;
}

template <ColorTypeEnum TColorType, typename TDerived>
TDerived CSSColorBase<TColorType, TDerived>::interpolate(
    double progress,
    const TDerived &to) const {
  ColorChannels fromChannels = channels;
  ColorChannels toChannels = to.channels;

  if (colorType == TColorType::Transparent) {
    fromChannels = {toChannels[0], toChannels[1], toChannels[2], 0};
  } else if (to.colorType == TColorType::Transparent) {
    toChannels = {fromChannels[0], fromChannels[1], fromChannels[2], 0};
  }

  ColorChannels resultChannels;
  for (size_t i = 0; i < 4; ++i) {
    const auto &from = fromChannels[i];
    const auto &to = toChannels[i];
    // Cast one of operands to double to avoid unsigned int subtraction overflow
    // (when from > to)
    const double interpolated =
        (static_cast<double>(to) - from) * progress + from;
    resultChannels[i] =
        static_cast<uint8_t>(std::round(std::clamp(interpolated, 0.0, 255.0)));
  }

  return TDerived(std::move(resultChannels));
}

template <ColorTypeEnum TColorType, typename TDerived>
bool CSSColorBase<TColorType, TDerived>::operator==(
    const TDerived &other) const {
  return colorType == other.colorType && channels == other.channels;
}

template <ColorTypeEnum TColorType, typename TDerived>
std::pair<TColorType, jsi::Value>
CSSColorBase<TColorType, TDerived>::parseJSIValue(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) const {
  const auto jsiObject = jsiValue.asObject(rt);
  const auto colorType = static_cast<TColorType>(
      jsiObject.getProperty(rt, "colorType").asNumber());

  if (colorType == TColorType::Rgba) {
    return {colorType, jsiObject.getProperty(rt, "value")};
  }
  return {colorType, jsi::Value::undefined()};
}

template <ColorTypeEnum TColorType, typename TDerived>
std::pair<TColorType, folly::dynamic>
CSSColorBase<TColorType, TDerived>::parseDynamicValue(
    const folly::dynamic &value) const {
  const auto colorType = static_cast<TColorType>(value.at("colorType").asInt());

  if (colorType == TColorType::Rgba) {
    return {colorType, value.at("value")};
  }
  return {colorType, folly::dynamic::object()};
}

// CSSColor implementations

CSSColor::CSSColor(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : CSSColorBase<CSSColorType, CSSColor>(CSSColorType::Transparent) {
  const auto [colorType, value] = parseJSIValue(rt, jsiValue);
  if (colorType == CSSColorType::Rgba) {
    *this = CSSColor(value.asNumber());
  }
}

CSSColor::CSSColor(const folly::dynamic &dynamicValue)
    : CSSColorBase<CSSColorType, CSSColor>(CSSColorType::Transparent) {
  const auto [colorType, value] = parseDynamicValue(dynamicValue);
  if (colorType == CSSColorType::Rgba) {
    *this = CSSColor(value.asInt());
  }
}

folly::dynamic CSSColor::toDynamic() const {
  if (colorType == CSSColorType::Transparent) {
    return 0;
  }
  return (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) |
      channels[2];
}

std::string CSSColor::toString() const {
  if (colorType == CSSColorType::Rgba) {
    return "rgba(" + std::to_string(channels[0]) + "," +
        std::to_string(channels[1]) + "," + std::to_string(channels[2]) + "," +
        std::to_string(channels[3]) + ")";
  }
  return "transparent";
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSColor &colorValue) {
  os << "CSSColor(" << colorValue.toString() << ")";
  return os;
}

#endif // NDEBUG

// Explicit template instantiation
template struct CSSColorBase<CSSColorType, CSSColor>;
template struct CSSColorBase<SVGBrushType, SVGBrush>;

} // namespace reanimated::css
