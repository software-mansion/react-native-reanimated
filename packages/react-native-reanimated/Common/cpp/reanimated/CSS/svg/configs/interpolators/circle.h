#pragma once

#include <reanimated/CSS/svg/configs/interpolators/common.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"cx", value<SVGLength, CSSKeyword>(0)},
        {"cy", value<SVGLength, CSSKeyword>(0)},
        {"r", value<SVGLength, CSSKeyword>(0)},
        {"opacity", value<CSSDouble>(1)},
    });

} // namespace reanimated::css
