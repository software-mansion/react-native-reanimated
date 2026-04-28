#include <reanimated/CSS/svg/values/SVGBrush.h>

#include <string>

namespace reanimated::css {

SVGBrush::SVGBrush(jsi::Runtime &rt, const jsi::Value &value)
    : CSSColorBase<SVGBrushType, SVGBrush>(SVGBrushType::Transparent) {
  if (value.isBool()) {
    *this = SVGBrush(value.getBool());
  } else if (value.isNumber()) {
    *this = SVGBrush(static_cast<int64_t>(value.getNumber()));
  } else if (value.asString(rt).utf8(rt) == "currentColor") {
    colorType = SVGBrushType::CurrentColor;
  }
}

SVGBrush::SVGBrush(const folly::dynamic &value) : CSSColorBase<SVGBrushType, SVGBrush>(SVGBrushType::Transparent) {
  if (value.isBool()) {
    *this = SVGBrush(value.getBool());
  } else if (value.isNumber()) {
    *this = SVGBrush(value.asInt());
  } else if (value.asString() == "currentColor") {
    colorType = SVGBrushType::CurrentColor;
  }
}

bool SVGBrush::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isNumber() || jsiValue.isBool() ||
      (jsiValue.isString() && jsiValue.getString(rt).utf8(rt) == "currentColor");
}

bool SVGBrush::canConstruct(const folly::dynamic &value) {
  return value.isNumber() || value.isBool() || value.asString() == "currentColor";
}

folly::dynamic SVGBrush::toDynamic() const {
  switch (colorType) {
    case SVGBrushType::Rgba:
      return (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) | channels[2];
    case SVGBrushType::CurrentColor:
      return nullptr; // currentColor is represented as nullptr in SVG
    default:
      return 0; // Transparent
  }
}

std::string SVGBrush::toString() const {
  switch (colorType) {
    case SVGBrushType::Rgba:
      return "rgba(" + std::to_string(channels[0]) + "," + std::to_string(channels[1]) + "," +
          std::to_string(channels[2]) + "," + std::to_string(channels[3]) + ")";
    case SVGBrushType::CurrentColor:
      return "currentColor";
    default:
      return "transparent";
  }
}

SVGBrush SVGBrush::interpolate(double progress, const SVGBrush &to) const {
  if (!isInterpolatable()) {
    return progress < 0.5 ? *this : to;
  }
  return CSSColorBase<SVGBrushType, SVGBrush>::interpolate(progress, to);
}

bool SVGBrush::isInterpolatable() const {
  return colorType == SVGBrushType::Rgba || colorType == SVGBrushType::Transparent;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const SVGBrush &colorValue) {
  os << "SVGBrush(" << colorValue.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
