#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/svg/values/SVGBrush.h>
#include <reanimated/CSS/utils/props.h>

#include <utility>

#include <string>

namespace reanimated::css {

// CSSColorBase template implementations

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase() : channels{0, 0, 0, 0}, colorType(TColorType::Transparent) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(TColorType colorType) : channels{0, 0, 0, 0}, colorType(colorType) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(int64_t numberValue)
    : channels(extractColorChannels(numberValue)), colorType(TColorType::Rgba) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(bool value)
    : channels{0, 0, 0, 0}, colorType(TColorType::Transparent) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(const uint8_t r, const uint8_t g, const uint8_t b, const uint8_t a)
    : channels{r, g, b, a}, colorType(TColorType::Rgba) {}

template <ColorTypeEnum TColorType, typename TDerived>
CSSColorBase<TColorType, TDerived>::CSSColorBase(ColorChannels colorChannels)
    : channels{colorChannels}, colorType(TColorType::Rgba) {}

template <ColorTypeEnum TColorType, typename TDerived>
TDerived CSSColorBase<TColorType, TDerived>::interpolate(double progress, const TDerived &to) const {
  ColorChannels fromChannels = channels;
  ColorChannels toChannels = to.channels;

  if (colorType == TColorType::Transparent) {
    fromChannels = {toChannels[0], toChannels[1], toChannels[2], 0};
  } else if (to.colorType == TColorType::Transparent) {
    toChannels = {fromChannels[0], fromChannels[1], fromChannels[2], 0};
  }

  ColorChannels resultChannels;
  for (size_t i = 0; i < 4; ++i) {
    const auto &fromValue = fromChannels[i];
    const auto &toValue = toChannels[i];
    // Cast one of operands to double to avoid unsigned int subtraction overflow
    // (when from > to)
    const double interpolated = (static_cast<double>(toValue) - fromValue) * progress + fromValue;
    resultChannels[i] = static_cast<uint8_t>(std::round(std::clamp(interpolated, 0.0, 255.0)));
  }

  return TDerived(resultChannels);
}

template <ColorTypeEnum TColorType, typename TDerived>
bool CSSColorBase<TColorType, TDerived>::operator==(const TDerived &other) const {
  return colorType == other.colorType && channels == other.channels;
}

// CSSColor implementations

CSSColor::CSSColor(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : CSSColorBase<CSSColorType, CSSColor>(CSSColorType::Transparent) {
  if (jsiValue.isBool()) {
    *this = CSSColor(jsiValue.getBool());
  } else if (jsiValue.isNumber()) {
    *this = CSSColor(static_cast<int64_t>(jsiValue.getNumber()));
  }
}

CSSColor::CSSColor(const folly::dynamic &value) : CSSColorBase<CSSColorType, CSSColor>(CSSColorType::Transparent) {
  if (value.isBool()) {
    *this = CSSColor(value.getBool());
  } else if (value.isNumber()) {
    *this = CSSColor(value.asInt());
  }
}

bool CSSColor::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isNumber() || jsiValue.isBool();
}

bool CSSColor::canConstruct(const folly::dynamic &value) {
  return value.isNumber() || value.isBool();
}

folly::dynamic CSSColor::toDynamic() const {
  if (colorType == CSSColorType::Rgba) {
    return (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) | channels[2];
  }
  return 0;
}

std::string CSSColor::toString() const {
  if (colorType == CSSColorType::Rgba) {
    return "rgba(" + std::to_string(channels[0]) + "," + std::to_string(channels[1]) + "," +
        std::to_string(channels[2]) + "," + std::to_string(channels[3]) + ")";
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
