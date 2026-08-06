#include <reanimated/CSS/common/values/complex/CSSBackgroundImage.h>

#include <jsi/JSIDynamic.h>

#include <cstdlib>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

namespace {

constexpr const char *LINEAR_GRADIENT_TYPE = "linear-gradient";
constexpr const char *RADIAL_GRADIENT_TYPE = "radial-gradient";

// Radial gradient position sides in the order used for serialization
const std::vector<std::string> POSITION_SIDES = {"top", "left", "bottom", "right"};

bool hasGradientType(const folly::dynamic &value, const char *gradientType) {
  if (!value.isObject()) {
    return false;
  }
  const auto typeIt = value.find("type");
  return typeIt != value.items().end() && typeIt->second.isString() && typeIt->second.getString() == gradientType;
}

bool hasGradientType(jsi::Runtime &rt, const jsi::Value &jsiValue, const char *gradientType) {
  if (!jsiValue.isObject()) {
    return false;
  }
  const auto &obj = jsiValue.asObject(rt);
  const auto type = obj.getProperty(rt, "type");
  return type.isString() && type.asString(rt).utf8(rt) == gradientType;
}

std::vector<GradientColorStop> colorStopsFromDynamic(const folly::dynamic &value) {
  std::vector<GradientColorStop> result;

  const auto stopsIt = value.find("colorStops");
  if (stopsIt != value.items().end() && stopsIt->second.isArray()) {
    result.reserve(stopsIt->second.size());
    for (const auto &stop : stopsIt->second) {
      result.push_back(GradientColorStop::fromDynamic(stop));
    }
  }

  return result;
}

} // namespace

// GradientLengthPercentage

std::optional<GradientLengthPercentage> GradientLengthPercentage::tryFromDynamic(const folly::dynamic &dynValue) {
  if (dynValue.isNumber()) {
    return GradientLengthPercentage{dynValue.asDouble(), false};
  }
  if (dynValue.isString()) {
    const auto &str = dynValue.getString();
    if (!str.empty() && str.back() == '%') {
      char *parseEnd = nullptr;
      const double parsedValue = std::strtod(str.c_str(), &parseEnd);
      if (parseEnd != str.c_str()) {
        return GradientLengthPercentage{parsedValue, true};
      }
    }
  }
  return std::nullopt;
}

folly::dynamic GradientLengthPercentage::toDynamic() const {
  if (isPercent) {
    return std::to_string(value) + "%";
  }
  return value;
}

std::string GradientLengthPercentage::toString() const {
  return isPercent ? (std::to_string(value) + "%") : std::to_string(value);
}

GradientLengthPercentage GradientLengthPercentage::interpolate(double progress, const GradientLengthPercentage &to)
    const {
  return {value + (to.value - value) * progress, isPercent};
}

bool GradientLengthPercentage::canInterpolateTo(const GradientLengthPercentage &to) const {
  return isPercent == to.isPercent;
}

// GradientColorStop

GradientColorStop GradientColorStop::fromDynamic(const folly::dynamic &dynValue) {
  GradientColorStop result;

  if (!dynValue.isObject()) {
    return result;
  }

  const auto colorIt = dynValue.find("color");
  if (colorIt != dynValue.items().end() && CSSColor::canConstruct(colorIt->second)) {
    result.color = CSSColor(colorIt->second);
  }

  const auto positionIt = dynValue.find("position");
  if (positionIt != dynValue.items().end()) {
    result.position = GradientLengthPercentage::tryFromDynamic(positionIt->second);
  }

  return result;
}

folly::dynamic GradientColorStop::toDynamic() const {
  folly::dynamic obj = folly::dynamic::object();
  obj["color"] = color.has_value() ? color->toDynamic() : folly::dynamic();
  obj["position"] = position.has_value() ? position->toDynamic() : folly::dynamic();
  return obj;
}

std::string GradientColorStop::toString() const {
  std::string result = color.has_value() ? color->toString() : "";
  if (position.has_value()) {
    result += (result.empty() ? "" : " ") + position->toString();
  }
  return result;
}

GradientColorStop GradientColorStop::interpolate(double progress, const GradientColorStop &to) const {
  GradientColorStop result;
  if (color.has_value() && to.color.has_value()) {
    result.color = color->interpolate(progress, *to.color);
  }
  if (position.has_value() && to.position.has_value()) {
    result.position = position->interpolate(progress, *to.position);
  }
  return result;
}

bool GradientColorStop::canInterpolateTo(const GradientColorStop &to) const {
  if (color.has_value() != to.color.has_value()) {
    return false;
  }
  if (position.has_value() != to.position.has_value()) {
    return false;
  }
  return !position.has_value() || position->canInterpolateTo(*to.position);
}

bool GradientColorStop::operator==(const GradientColorStop &other) const {
  return color == other.color && position == other.position;
}

bool areColorStopsCompatible(const std::vector<GradientColorStop> &from, const std::vector<GradientColorStop> &to) {
  if (from.size() != to.size()) {
    return false;
  }
  for (size_t i = 0; i < from.size(); ++i) {
    if (!from[i].canInterpolateTo(to[i])) {
      return false;
    }
  }
  return true;
}

std::vector<GradientColorStop> interpolateColorStops(
    double progress,
    const std::vector<GradientColorStop> &from,
    const std::vector<GradientColorStop> &to) {
  std::vector<GradientColorStop> result;
  result.reserve(from.size());
  for (size_t i = 0; i < from.size(); ++i) {
    result.push_back(from[i].interpolate(progress, to[i]));
  }
  return result;
}

// CSSLinearGradient

CSSLinearGradient::CSSLinearGradient(double angle, std::vector<GradientColorStop> colorStops)
    : angle(angle), colorStops(std::move(colorStops)) {}

CSSLinearGradient::CSSLinearGradient(std::string keyword, std::vector<GradientColorStop> colorStops)
    : isKeywordDirection(true), keyword(std::move(keyword)), colorStops(std::move(colorStops)) {}

CSSLinearGradient::CSSLinearGradient(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : CSSLinearGradient(jsi::dynamicFromValue(rt, jsiValue)) {}

CSSLinearGradient::CSSLinearGradient(const folly::dynamic &value) {
  const auto directionIt = value.find("direction");
  if (directionIt != value.items().end() && directionIt->second.isObject()) {
    const auto &direction = directionIt->second;
    const auto typeIt = direction.find("type");
    const auto valueIt = direction.find("value");
    if (typeIt != direction.items().end() && valueIt != direction.items().end()) {
      if (typeIt->second == "keyword" && valueIt->second.isString()) {
        isKeywordDirection = true;
        keyword = valueIt->second.getString();
      } else if (typeIt->second == "angle" && valueIt->second.isNumber()) {
        angle = valueIt->second.asDouble();
      }
    }
  }

  colorStops = colorStopsFromDynamic(value);
}

bool CSSLinearGradient::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return hasGradientType(rt, jsiValue, LINEAR_GRADIENT_TYPE);
}

bool CSSLinearGradient::canConstruct(const folly::dynamic &value) {
  return hasGradientType(value, LINEAR_GRADIENT_TYPE);
}

folly::dynamic CSSLinearGradient::toDynamic() const {
  folly::dynamic direction = folly::dynamic::object();
  if (isKeywordDirection) {
    direction["type"] = "keyword";
    direction["value"] = keyword;
  } else {
    direction["type"] = "angle";
    direction["value"] = angle;
  }

  folly::dynamic stops = folly::dynamic::array();
  for (const auto &stop : colorStops) {
    stops.push_back(stop.toDynamic());
  }

  folly::dynamic obj = folly::dynamic::object();
  obj["type"] = LINEAR_GRADIENT_TYPE;
  obj["direction"] = std::move(direction);
  obj["colorStops"] = std::move(stops);
  return obj;
}

std::string CSSLinearGradient::toString() const {
  std::string result = "linear-gradient(";
  result += isKeywordDirection ? keyword : (std::to_string(angle) + "deg");
  for (const auto &stop : colorStops) {
    result += ", " + stop.toString();
  }
  return result + ")";
}

CSSLinearGradient CSSLinearGradient::interpolate(double progress, const CSSLinearGradient &to) const {
  auto stops = interpolateColorStops(progress, colorStops, to.colorStops);
  if (isKeywordDirection) {
    return CSSLinearGradient(keyword, std::move(stops));
  }
  return CSSLinearGradient(angle + (to.angle - angle) * progress, std::move(stops));
}

bool CSSLinearGradient::canInterpolateTo(const CSSLinearGradient &to) const {
  if (isKeywordDirection != to.isKeywordDirection) {
    return false;
  }
  if (isKeywordDirection && keyword != to.keyword) {
    return false;
  }
  return areColorStopsCompatible(colorStops, to.colorStops);
}

bool CSSLinearGradient::operator==(const CSSLinearGradient &other) const {
  return isKeywordDirection == other.isKeywordDirection && angle == other.angle && keyword == other.keyword &&
      colorStops == other.colorStops;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSLinearGradient &gradientValue) {
  os << "CSSLinearGradient(" << gradientValue.toString() << ")";
  return os;
}

#endif // NDEBUG

// CSSRadialGradient

CSSRadialGradient::CSSRadialGradient()
    : position({{"top", GradientLengthPercentage{50, true}}, {"left", GradientLengthPercentage{50, true}}}) {}

CSSRadialGradient::CSSRadialGradient(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : CSSRadialGradient(jsi::dynamicFromValue(rt, jsiValue)) {}

CSSRadialGradient::CSSRadialGradient(const folly::dynamic &value) {
  const auto shapeIt = value.find("shape");
  if (shapeIt != value.items().end() && shapeIt->second.isString()) {
    shape = shapeIt->second.getString();
  }

  const auto sizeIt = value.find("size");
  if (sizeIt != value.items().end()) {
    const auto &size = sizeIt->second;
    if (size.isString()) {
      sizeKeyword = size.getString();
    } else if (size.isObject()) {
      const auto xIt = size.find("x");
      const auto yIt = size.find("y");
      if (xIt != size.items().end() && yIt != size.items().end()) {
        const auto x = GradientLengthPercentage::tryFromDynamic(xIt->second);
        const auto y = GradientLengthPercentage::tryFromDynamic(yIt->second);
        if (x.has_value() && y.has_value()) {
          sizeKeyword = std::nullopt;
          sizeX = x;
          sizeY = y;
        }
      }
    }
  }

  const auto positionIt = value.find("position");
  if (positionIt != value.items().end() && positionIt->second.isObject()) {
    for (const auto &side : POSITION_SIDES) {
      const auto sideIt = positionIt->second.find(side);
      if (sideIt != positionIt->second.items().end()) {
        const auto sideValue = GradientLengthPercentage::tryFromDynamic(sideIt->second);
        if (sideValue.has_value()) {
          position.emplace_back(side, *sideValue);
        }
      }
    }
  }
  if (position.empty()) {
    position = {{"top", GradientLengthPercentage{50, true}}, {"left", GradientLengthPercentage{50, true}}};
  }

  colorStops = colorStopsFromDynamic(value);
}

bool CSSRadialGradient::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return hasGradientType(rt, jsiValue, RADIAL_GRADIENT_TYPE);
}

bool CSSRadialGradient::canConstruct(const folly::dynamic &value) {
  return hasGradientType(value, RADIAL_GRADIENT_TYPE);
}

folly::dynamic CSSRadialGradient::toDynamic() const {
  folly::dynamic obj = folly::dynamic::object();
  obj["type"] = RADIAL_GRADIENT_TYPE;
  obj["shape"] = shape;

  if (sizeKeyword.has_value()) {
    obj["size"] = *sizeKeyword;
  } else {
    folly::dynamic size = folly::dynamic::object();
    size["x"] = sizeX.has_value() ? sizeX->toDynamic() : folly::dynamic();
    size["y"] = sizeY.has_value() ? sizeY->toDynamic() : folly::dynamic();
    obj["size"] = std::move(size);
  }

  folly::dynamic positionObj = folly::dynamic::object();
  for (const auto &[side, sideValue] : position) {
    positionObj[side] = sideValue.toDynamic();
  }
  obj["position"] = std::move(positionObj);

  folly::dynamic stops = folly::dynamic::array();
  for (const auto &stop : colorStops) {
    stops.push_back(stop.toDynamic());
  }
  obj["colorStops"] = std::move(stops);

  return obj;
}

std::string CSSRadialGradient::toString() const {
  std::string result = "radial-gradient(" + shape;
  if (sizeKeyword.has_value()) {
    result += " " + *sizeKeyword;
  } else if (sizeX.has_value() && sizeY.has_value()) {
    result += " " + sizeX->toString() + " " + sizeY->toString();
  }
  result += " at";
  for (const auto &[side, sideValue] : position) {
    result += " " + side + " " + sideValue.toString();
  }
  for (const auto &stop : colorStops) {
    result += ", " + stop.toString();
  }
  return result + ")";
}

CSSRadialGradient CSSRadialGradient::interpolate(double progress, const CSSRadialGradient &to) const {
  CSSRadialGradient result;
  result.shape = shape;
  result.sizeKeyword = sizeKeyword;
  if (!sizeKeyword.has_value() && sizeX.has_value() && to.sizeX.has_value() && sizeY.has_value() &&
      to.sizeY.has_value()) {
    result.sizeX = sizeX->interpolate(progress, *to.sizeX);
    result.sizeY = sizeY->interpolate(progress, *to.sizeY);
  } else {
    result.sizeX = sizeX;
    result.sizeY = sizeY;
  }

  result.position.clear();
  result.position.reserve(position.size());
  for (size_t i = 0; i < position.size(); ++i) {
    result.position.emplace_back(position[i].first, position[i].second.interpolate(progress, to.position[i].second));
  }

  result.colorStops = interpolateColorStops(progress, colorStops, to.colorStops);
  return result;
}

bool CSSRadialGradient::canInterpolateTo(const CSSRadialGradient &to) const {
  if (shape != to.shape) {
    return false;
  }
  if (sizeKeyword.has_value() != to.sizeKeyword.has_value()) {
    return false;
  }
  if (sizeKeyword.has_value() && *sizeKeyword != *to.sizeKeyword) {
    return false;
  }
  if (!sizeKeyword.has_value() &&
      (!sizeX.has_value() || !to.sizeX.has_value() || !sizeX->canInterpolateTo(*to.sizeX) || !sizeY.has_value() ||
       !to.sizeY.has_value() || !sizeY->canInterpolateTo(*to.sizeY))) {
    return false;
  }
  if (position.size() != to.position.size()) {
    return false;
  }
  for (size_t i = 0; i < position.size(); ++i) {
    if (position[i].first != to.position[i].first || !position[i].second.canInterpolateTo(to.position[i].second)) {
      return false;
    }
  }
  return areColorStopsCompatible(colorStops, to.colorStops);
}

bool CSSRadialGradient::operator==(const CSSRadialGradient &other) const {
  return shape == other.shape && sizeKeyword == other.sizeKeyword && sizeX == other.sizeX && sizeY == other.sizeY &&
      position == other.position && colorStops == other.colorStops;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSRadialGradient &gradientValue) {
  os << "CSSRadialGradient(" << gradientValue.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
