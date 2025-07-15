#pragma once

#include <reanimated/CSS/config/props/svg/common.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_PATH_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    // TODO - add more properties
    InterpolatorFactoriesRecord{});

} // namespace reanimated::css
