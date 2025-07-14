#pragma once

#include <reanimated/CSS/config/interpolators/svg/common.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"cx", value<CSSDimension, CSSKeyword>(0)},
        {"cy", value<CSSDimension, CSSKeyword>(0)},
        {"r", value<CSSDimension, CSSKeyword>(0)},
        {"opacity", value<CSSDouble>(1)},
    });

} // namespace reanimated::css
