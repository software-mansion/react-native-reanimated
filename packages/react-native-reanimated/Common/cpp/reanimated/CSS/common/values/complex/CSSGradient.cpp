#include <reanimated/CSS/common/values/complex/CSSGradient.h>

#include <jsi/JSIDynamic.h>

#include <folly/Conv.h>
#include <algorithm>
#include <sstream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

namespace {

constexpr const char *LINEAR_GRADIENT = "linear-gradient";
constexpr const char *RADIAL_GRADIENT = "radial-gradient";

bool isValidLength(const folly::dynamic &value) {
  return CSSGradientLength::fromDynamic(value).has_value();
}

bool isValidColorStop(const folly::dynamic &stop) {
  if (!stop.isObject()) {
    return false;
  }
  if (stop.count("color") > 0 && !stop["color"].isNull() && !CSSColor::canConstruct(stop["color"])) {
    return false;
  }
  return stop.count("position") == 0 || stop["position"].isNull() || isValidLength(stop["position"]);
}

bool isValidDirection(const folly::dynamic &direction) {
  if (!direction.isObject() || direction.count("type") == 0 || direction.count("value") == 0 ||
      !direction["type"].isString()) {
    return false;
  }
  const auto &type = direction["type"].asString();
  if (type == "angle") {
    return direction["value"].isNumber();
  }
  return type == "keyword" && direction["value"].isString();
}

bool isValidShape(const folly::dynamic &shape) {
  return shape.isString() && (shape.asString() == "circle" || shape.asString() == "ellipse");
}

const char *shapeToString(const CSSGradient::Shape shape) {
  return shape == CSSGradient::Shape::Circle ? "circle" : "ellipse";
}

const std::unordered_map<std::string, CSSGradient::SizeKeyword> SIZE_KEYWORDS = {
    {"closest-side", CSSGradient::SizeKeyword::ClosestSide},
    {"closest-corner", CSSGradient::SizeKeyword::ClosestCorner},
    {"farthest-side", CSSGradient::SizeKeyword::FarthestSide},
    {"farthest-corner", CSSGradient::SizeKeyword::FarthestCorner}};

const char *sizeKeywordToString(const CSSGradient::SizeKeyword keyword) {
  switch (keyword) {
    case CSSGradient::SizeKeyword::ClosestSide:
      return "closest-side";
    case CSSGradient::SizeKeyword::ClosestCorner:
      return "closest-corner";
    case CSSGradient::SizeKeyword::FarthestSide:
      return "farthest-side";
    case CSSGradient::SizeKeyword::FarthestCorner:
      return "farthest-corner";
  }
}

bool isValidRadialSize(const folly::dynamic &size) {
  if (size.isString()) {
    return SIZE_KEYWORDS.contains(size.asString());
  }
  return size.isObject() && size.count("x") > 0 && size.count("y") > 0 && isValidLength(size["x"]) &&
      isValidLength(size["y"]);
}

bool isValidRadialPosition(const folly::dynamic &position) {
  if (!position.isObject()) {
    return false;
  }
  for (const auto &[key, value] : position.items()) {
    if (!isValidLength(value)) {
      return false;
    }
  }
  return true;
}

std::optional<CSSGradientLength> readLength(const folly::dynamic &object, const char *key) {
  if (object.count(key) == 0 || object[key].isNull()) {
    return std::nullopt;
  }
  return CSSGradientLength::fromDynamic(object[key]);
}

folly::dynamic optionalToDynamic(const std::optional<CSSGradientLength> &length) {
  return length ? length->toDynamic() : folly::dynamic();
}

bool canInterpolateOptional(const std::optional<CSSGradientLength> &from, const std::optional<CSSGradientLength> &to) {
  if (from.has_value() != to.has_value()) {
    return false;
  }
  return !from.has_value() || from->canInterpolateTo(*to);
}

std::optional<CSSGradientLength> interpolateOptional(
    const double progress,
    const std::optional<CSSGradientLength> &from,
    const std::optional<CSSGradientLength> &to) {
  if (!from.has_value() || !to.has_value()) {
    return from;
  }
  return from->interpolate(progress, *to);
}

} // namespace

std::optional<CSSGradientLength> CSSGradientLength::fromDynamic(const folly::dynamic &value) {
  if (value.isNumber()) {
    return CSSGradientLength{value.asDouble(), false};
  }
  if (!value.isString()) {
    return std::nullopt;
  }
  const auto &str = value.asString();
  if (str.size() < 2 || str.back() != '%') {
    return std::nullopt;
  }
  const auto parsed = folly::tryTo<double>(std::string_view(str).substr(0, str.size() - 1));
  if (!parsed.hasValue()) {
    return std::nullopt;
  }
  return CSSGradientLength{parsed.value(), true};
}

folly::dynamic CSSGradientLength::toDynamic() const {
  if (isPercent) {
    return folly::to<std::string>(value) + "%";
  }
  return value;
}

std::string CSSGradientLength::toString() const {
  return folly::to<std::string>(value) + (isPercent ? "%" : "");
}

CSSGradientLength CSSGradientLength::interpolate(const double progress, const CSSGradientLength &to) const {
  return CSSGradientLength{value + (to.value - value) * progress, isPercent};
}

bool CSSGradientLength::canInterpolateTo(const CSSGradientLength &to) const {
  return isPercent == to.isPercent;
}

bool CSSGradientLength::operator==(const CSSGradientLength &other) const {
  return value == other.value && isPercent == other.isPercent;
}

bool CSSGradient::ColorStop::operator==(const ColorStop &other) const {
  return color == other.color && position == other.position;
}

bool CSSGradient::RadialPosition::operator==(const RadialPosition &other) const {
  return top == other.top && left == other.left && right == other.right && bottom == other.bottom;
}

CSSGradient::CSSGradient(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : CSSGradient(jsi::dynamicFromValue(rt, jsiValue)) {}

CSSGradient::CSSGradient(const folly::dynamic &value) {
  type = value["type"].asString() == RADIAL_GRADIENT ? Type::Radial : Type::Linear;

  if (type == Type::Linear) {
    if (value.count("direction") > 0) {
      const auto &directionValue = value["direction"];
      if (directionValue["type"].asString() == "angle") {
        direction = directionValue["value"].asDouble();
      } else {
        direction = directionValue["value"].asString();
      }
    }
  } else {
    if (value.count("shape") > 0) {
      shape = value["shape"].asString() == "circle" ? Shape::Circle : Shape::Ellipse;
    }
    if (value.count("size") > 0) {
      const auto &sizeValue = value["size"];
      if (sizeValue.isString()) {
        size = SIZE_KEYWORDS.at(sizeValue.asString());
      } else {
        size = std::make_pair(
            CSSGradientLength::fromDynamic(sizeValue["x"]).value(),
            CSSGradientLength::fromDynamic(sizeValue["y"]).value());
      }
    }
    if (value.count("position") > 0) {
      const auto &positionValue = value["position"];
      position.top = readLength(positionValue, "top");
      position.left = readLength(positionValue, "left");
      position.right = readLength(positionValue, "right");
      position.bottom = readLength(positionValue, "bottom");
    }
  }

  const auto &stops = value["colorStops"];
  colorStops.reserve(stops.size());
  for (const auto &stop : stops) {
    ColorStop colorStop;
    if (stop.count("color") > 0 && !stop["color"].isNull()) {
      colorStop.color = CSSColor(stop["color"]);
    }
    colorStop.position = readLength(stop, "position");
    colorStops.push_back(std::move(colorStop));
  }
}

bool CSSGradient::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isObject() && canConstruct(jsi::dynamicFromValue(rt, jsiValue));
}

bool CSSGradient::canConstruct(const folly::dynamic &value) {
  if (!value.isObject() || value.count("type") == 0 || !value["type"].isString() || value.count("colorStops") == 0 ||
      !value["colorStops"].isArray()) {
    return false;
  }

  const auto &type = value["type"].asString();
  if (type == LINEAR_GRADIENT) {
    if (value.count("direction") > 0 && !isValidDirection(value["direction"])) {
      return false;
    }
  } else if (type == RADIAL_GRADIENT) {
    if (value.count("shape") > 0 && !isValidShape(value["shape"])) {
      return false;
    }
    if (value.count("size") > 0 && !isValidRadialSize(value["size"])) {
      return false;
    }
    if (value.count("position") > 0 && !isValidRadialPosition(value["position"])) {
      return false;
    }
  } else {
    return false;
  }

  return std::all_of(value["colorStops"].begin(), value["colorStops"].end(), isValidColorStop);
}

folly::dynamic CSSGradient::toDynamic() const {
  folly::dynamic result = folly::dynamic::object();

  if (type == Type::Linear) {
    result["type"] = LINEAR_GRADIENT;
    folly::dynamic directionValue = folly::dynamic::object();
    if (const auto *angle = std::get_if<double>(&direction)) {
      directionValue["type"] = "angle";
      directionValue["value"] = *angle;
    } else {
      directionValue["type"] = "keyword";
      directionValue["value"] = std::get<std::string>(direction);
    }
    result["direction"] = std::move(directionValue);
  } else {
    result["type"] = RADIAL_GRADIENT;
    result["shape"] = shapeToString(shape);
    if (const auto *keyword = std::get_if<SizeKeyword>(&size)) {
      result["size"] = sizeKeywordToString(*keyword);
    } else {
      const auto &[x, y] = std::get<std::pair<CSSGradientLength, CSSGradientLength>>(size);
      result["size"] = folly::dynamic::object("x", x.toDynamic())("y", y.toDynamic());
    }
    folly::dynamic positionValue = folly::dynamic::object();
    if (position.top) {
      positionValue["top"] = position.top->toDynamic();
    }
    if (position.left) {
      positionValue["left"] = position.left->toDynamic();
    }
    if (position.right) {
      positionValue["right"] = position.right->toDynamic();
    }
    if (position.bottom) {
      positionValue["bottom"] = position.bottom->toDynamic();
    }
    result["position"] = std::move(positionValue);
  }

  folly::dynamic stops = folly::dynamic::array();
  if (isNone()) {
    const auto transparent = CSSColor().toDynamic();
    stops.push_back(folly::dynamic::object("color", transparent)("position", folly::dynamic()));
    stops.push_back(folly::dynamic::object("color", transparent)("position", folly::dynamic()));
  } else {
    for (const auto &stop : colorStops) {
      stops.push_back(folly::dynamic::object("color", stop.color ? stop.color->toDynamic() : folly::dynamic())(
          "position", optionalToDynamic(stop.position)));
    }
  }
  result["colorStops"] = std::move(stops);

  return result;
}

std::string CSSGradient::toString() const {
  std::stringstream ss;
  if (type == Type::Linear) {
    ss << LINEAR_GRADIENT << "(";
    if (const auto *angle = std::get_if<double>(&direction)) {
      ss << *angle << "deg";
    } else {
      ss << std::get<std::string>(direction);
    }
  } else {
    ss << RADIAL_GRADIENT << "(" << shapeToString(shape) << " ";
    if (const auto *keyword = std::get_if<SizeKeyword>(&size)) {
      ss << sizeKeywordToString(*keyword);
    } else {
      const auto &[x, y] = std::get<std::pair<CSSGradientLength, CSSGradientLength>>(size);
      ss << x.toString() << " " << y.toString();
    }
    ss << " at";
    if (position.top) {
      ss << " top " << position.top->toString();
    }
    if (position.bottom) {
      ss << " bottom " << position.bottom->toString();
    }
    if (position.left) {
      ss << " left " << position.left->toString();
    }
    if (position.right) {
      ss << " right " << position.right->toString();
    }
  }
  for (const auto &stop : colorStops) {
    ss << ", ";
    if (stop.color) {
      ss << stop.color->toString();
    }
    if (stop.position) {
      ss << (stop.color ? " " : "") << stop.position->toString();
    }
  }
  ss << ")";
  return ss.str();
}

CSSGradient CSSGradient::interpolate(const double progress, const CSSGradient &to) const {
  if (isNone()) [[unlikely]] {
    return to.isNone() ? *this : to.withTransparentColors().interpolate(progress, to);
  }
  if (to.isNone()) [[unlikely]] {
    return interpolate(progress, withTransparentColors());
  }

  CSSGradient result = *this;

  if (type == Type::Linear) {
    const auto *fromAngle = std::get_if<double>(&direction);
    const auto *toAngle = std::get_if<double>(&to.direction);
    if (fromAngle != nullptr && toAngle != nullptr) {
      result.direction = *fromAngle + (*toAngle - *fromAngle) * progress;
    }
  } else {
    const auto *fromSize = std::get_if<std::pair<CSSGradientLength, CSSGradientLength>>(&size);
    const auto *toSize = std::get_if<std::pair<CSSGradientLength, CSSGradientLength>>(&to.size);
    if (fromSize != nullptr && toSize != nullptr) {
      result.size = std::make_pair(
          fromSize->first.interpolate(progress, toSize->first), fromSize->second.interpolate(progress, toSize->second));
    }
    result.position.top = interpolateOptional(progress, position.top, to.position.top);
    result.position.left = interpolateOptional(progress, position.left, to.position.left);
    result.position.right = interpolateOptional(progress, position.right, to.position.right);
    result.position.bottom = interpolateOptional(progress, position.bottom, to.position.bottom);
  }

  const auto count = std::max(colorStops.size(), to.colorStops.size());
  const auto fromStops = paddedColorStops(count);
  const auto toStops = to.paddedColorStops(count);
  const auto fromPositions = resolvedStopPositions(fromStops);
  const auto toPositions = resolvedStopPositions(toStops);

  result.colorStops.clear();
  result.colorStops.reserve(count);
  for (size_t i = 0; i < count; ++i) {
    ColorStop stop;
    if (fromStops[i].color && toStops[i].color) {
      stop.color = fromStops[i].color->interpolate(progress, *toStops[i].color);
    }
    if (fromStops[i].position || toStops[i].position) {
      stop.position = interpolateOptional(progress, fromPositions[i], toPositions[i]);
    }
    result.colorStops.push_back(std::move(stop));
  }

  return result;
}

bool CSSGradient::canInterpolateTo(const CSSGradient &to) const {
  if (isNone() || to.isNone()) {
    return true;
  }
  if (type != to.type) [[unlikely]] {
    return false;
  }

  if (type == Type::Linear) {
    if (direction.index() != to.direction.index()) {
      return false;
    }
    if (const auto *keyword = std::get_if<std::string>(&direction);
        keyword && *keyword != std::get<std::string>(to.direction)) {
      return false;
    }
  } else {
    if (shape != to.shape || size.index() != to.size.index()) {
      return false;
    }
    if (const auto *keyword = std::get_if<SizeKeyword>(&size)) {
      if (*keyword != std::get<SizeKeyword>(to.size)) {
        return false;
      }
    } else {
      const auto &fromSize = std::get<std::pair<CSSGradientLength, CSSGradientLength>>(size);
      const auto &toSize = std::get<std::pair<CSSGradientLength, CSSGradientLength>>(to.size);
      if (!fromSize.first.canInterpolateTo(toSize.first) || !fromSize.second.canInterpolateTo(toSize.second)) {
        return false;
      }
    }
    if (!canInterpolateOptional(position.top, to.position.top) ||
        !canInterpolateOptional(position.left, to.position.left) ||
        !canInterpolateOptional(position.right, to.position.right) ||
        !canInterpolateOptional(position.bottom, to.position.bottom)) {
      return false;
    }
  }

  const auto count = std::max(colorStops.size(), to.colorStops.size());
  const auto fromStops = paddedColorStops(count);
  const auto toStops = to.paddedColorStops(count);
  const auto fromPositions = resolvedStopPositions(fromStops);
  const auto toPositions = resolvedStopPositions(toStops);

  for (size_t i = 0; i < count; ++i) {
    if (fromStops[i].color.has_value() != toStops[i].color.has_value()) {
      return false;
    }
    if (!canInterpolateOptional(fromPositions[i], toPositions[i])) {
      return false;
    }
  }

  return true;
}

bool CSSGradient::operator==(const CSSGradient &other) const {
  return type == other.type && direction == other.direction && shape == other.shape && size == other.size &&
      position == other.position && colorStops == other.colorStops;
}

bool CSSGradient::isNone() const {
  return colorStops.empty();
}

CSSGradient CSSGradient::withTransparentColors() const {
  CSSGradient result = *this;
  for (auto &stop : result.colorStops) {
    if (stop.color) {
      stop.color = CSSColor();
    }
  }
  return result;
}

std::vector<CSSGradient::ColorStop> CSSGradient::paddedColorStops(const size_t count) const {
  std::vector<ColorStop> result = colorStops;
  if (result.size() < count && !result.back().position) {
    result.back().position = CSSGradientLength{100, true};
  }
  while (result.size() < count) {
    result.push_back(result.back());
  }
  return result;
}

std::vector<std::optional<CSSGradientLength>> CSSGradient::resolvedStopPositions(const std::vector<ColorStop> &stops) {
  const auto count = stops.size();
  std::vector<std::optional<CSSGradientLength>> positions;
  positions.reserve(count);
  for (const auto &stop : stops) {
    positions.push_back(stop.position);
  }

  if (!positions.front()) {
    positions.front() = CSSGradientLength{0, true};
  }
  if (!positions.back()) {
    positions.back() = CSSGradientLength{100, true};
  }

  size_t runStart = 1;
  while (runStart < count) {
    if (positions[runStart]) {
      ++runStart;
      continue;
    }
    size_t runEnd = runStart;
    while (!positions[runEnd]) {
      ++runEnd;
    }
    const auto &previous = *positions[runStart - 1];
    const auto &next = *positions[runEnd];
    if (previous.isPercent && next.isPercent) {
      const auto step = (next.value - previous.value) / static_cast<double>(runEnd - runStart + 1);
      for (size_t i = runStart; i < runEnd; ++i) {
        positions[i] = CSSGradientLength{previous.value + step * static_cast<double>(i - runStart + 1), true};
      }
    }
    runStart = runEnd + 1;
  }

  return positions;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSGradient &gradient) {
  os << "CSSGradient(" << gradient.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
