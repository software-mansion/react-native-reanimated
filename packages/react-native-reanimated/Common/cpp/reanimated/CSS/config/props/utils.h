#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

namespace reanimated::css {

inline InterpolatorFactoriesRecord mergeInterpolators(
    const InterpolatorFactoriesRecord &map) {
  return map;
}

template <typename... TInterpolatorMaps>
InterpolatorFactoriesRecord mergeInterpolators(
    const TInterpolatorMaps &...maps) {
  InterpolatorFactoriesRecord result;
  (result.insert(maps.begin(), maps.end()), ...);
  return result;
}

} // namespace reanimated::css
