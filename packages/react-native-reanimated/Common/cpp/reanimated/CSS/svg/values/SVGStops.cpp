#include <reanimated/CSS/svg/values/SVGStops.h>

#include <algorithm>
#include <cstddef>
#include <functional>
#include <optional>
#include <regex>
#include <string>
#include "reanimated/CSS/svg/values/SVGBrush.h"

namespace reanimated::css {

SVGStops::SVGStops(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  jsi::Array array = jsiValue.asObject(rt).asArray(rt);
  size_t length = array.size(rt);

  stops.reserve(length / 2);

  for (size_t i = 0; i < length; i += 2) {
    double offset = array.getValueAtIndex(rt, i).asNumber();
    auto colorVal = array.getValueAtIndex(rt, i + 1);

    stops.emplace_back(offset, SVGBrush(rt, colorVal));
  }
}

SVGStops::SVGStops(const folly::dynamic &value) {
  stops.reserve(value.size() / 2);

  for (size_t i = 0; i < value.size(); i += 2) {
    double offset = value[i].asDouble();
    stops.emplace_back(offset, SVGBrush(value[i + 1]));
  }
}

bool SVGStops::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isObject()) {
    return false;
  }

  auto obj = jsiValue.asObject(rt);
  if (!obj.isArray(rt)) {
    return false;
  }

  auto array = obj.asArray(rt);
  size_t length = array.size(rt);

  if (length == 0) {
    return true;
  }

  // [offset, brush, offset, brush, ...]
  if (length % 2 != 0) {
    return false;
  }

  auto firstOffset = array.getValueAtIndex(rt, 0);
  auto firstBrush = array.getValueAtIndex(rt, 1);

  return firstOffset.isNumber() && SVGBrush::canConstruct(rt, firstBrush);
}

bool SVGStops::canConstruct(const folly::dynamic &value) {
  if (!value.isArray()) {
    return false;
  }

  if (value.empty()) {
    return true;
  }

  // [offset, brush, offset, brush, ...]
  if (value.size() % 2 != 0) {
    return false;
  }

  const auto &firstOffset = value[0];
  const auto &firstBrush = value[1];

  return firstOffset.isNumber() && SVGBrush::canConstruct(firstBrush);
}

folly::dynamic SVGStops::toDynamic() const {
  folly::dynamic array = folly::dynamic::array;

  for (const auto &stop : stops) {
    array.push_back(stop.offset);
    array.push_back(stop.color.toDynamic());
  }

  return array;
}

std::string SVGStops::toString() const {
  if (stops.empty()) {
    return "none";
  }

  std::stringstream ss;
  ss << "stops(";
  for (size_t i = 0; i < stops.size(); ++i) {
    ss << stops[i].color.toString() << " " << (stops[i].offset * 100) << "%";
    if (i < stops.size() - 1) {
      ss << ", ";
    }
  }
  ss << ")";
  return ss.str();
}

SVGStops SVGStops::interpolate(double progress, const SVGStops &to) const {
  const auto &fromStops = stops;
  const auto &toStops = to.stops;

  if (fromStops.empty() || toStops.empty()) {
    return progress < 0.5 ? *this : to;
  }

  size_t fromSize = fromStops.size();
  size_t toSize = toStops.size();
  size_t longerSize = std::max(toSize, fromSize);

  std::vector<GradientStop> interpolatedStops;
  interpolatedStops.reserve(longerSize);

  for (size_t i = 0; i < longerSize; ++i) {
    double ratio = (longerSize > 1) ? static_cast<double>(i) / (static_cast<double>(longerSize) - 1.0) : 0.0;

    auto fromIdx = static_cast<size_t>(std::round(ratio * (fromSize - 1)));
    auto toIdx = static_cast<size_t>(std::round(ratio * (toSize - 1)));

    const auto &sFrom = fromStops[fromIdx];
    const auto &sTo = toStops[toIdx];

    double mixedOffset = sFrom.offset + (sTo.offset - sFrom.offset) * progress;

    SVGBrush mixedBrush = sFrom.color.interpolate(progress, sTo.color);

    interpolatedStops.emplace_back(mixedOffset, std::move(mixedBrush));
  }

  return SVGStops(std::move(interpolatedStops));
}

bool SVGStops::operator==(const SVGStops &other) const {
  return toString() == other.toString();
}

#ifndef NDEBUG
std::ostream &operator<<(std::ostream &os, const SVGStops &value) {
  os << "SVGStops{ count: " << value.stops.size() << ", data: [";
  for (size_t i = 0; i < value.stops.size(); ++i) {
    os << "{ offset: " << value.stops[i].offset << ", brush: " << value.stops[i].color.toString() << " }";
    if (i < value.stops.size() - 1) {
      os << ", ";
    }
  }
  os << "] }";
  return os;
}
#endif

} // namespace reanimated::css
