#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/utils/FloatComparison.h>

#include <array>
#include <cmath>

namespace reanimated {

/// React Native compares text attributes with kDefaultEpsilon but lays them out
/// exactly, so a smaller step moves the frame while the text keeps its old
/// metrics. Rounding to a coarser grid makes every change exceed the epsilon.
/// https://github.com/facebook/react-native/blob/v0.87.0/packages/react-native/ReactCommon/react/renderer/attributedstring/TextAttributes.cpp#L174-L177
inline constexpr std::array<const char *, 3> TEXT_METRIC_PROP_NAMES = {"fontSize", "letterSpacing", "lineHeight"};

inline double roundTextMetric(const double value) {
  constexpr double stepsPerUnit = 100;
  static_assert(1 / stepsPerUnit > facebook::react::kDefaultEpsilon);
  return std::round(value * stepsPerUnit) / stepsPerUnit;
}

inline void roundTextMetrics(facebook::jsi::Runtime &rt, const facebook::jsi::Value &props) {
  const auto object = props.asObject(rt);
  for (const auto *propName : TEXT_METRIC_PROP_NAMES) {
    const auto value = object.getProperty(rt, propName);
    if (value.isNumber()) {
      object.setProperty(rt, propName, roundTextMetric(value.asNumber()));
    }
  }
}

inline void roundTextMetrics(folly::dynamic &props) {
  for (const auto *propName : TEXT_METRIC_PROP_NAMES) {
    auto *value = props.get_ptr(propName);
    if (value != nullptr && value->isNumber()) {
      *value = roundTextMetric(value->asDouble());
    }
  }
}

} // namespace reanimated
