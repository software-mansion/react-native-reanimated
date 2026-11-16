#pragma once

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

} // namespace reanimated
