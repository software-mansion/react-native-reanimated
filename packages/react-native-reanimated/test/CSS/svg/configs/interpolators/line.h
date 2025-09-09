#pragma once

#include <reanimated/CSS/svg/configs/interpolators/common.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"x1", value<SVGLength, CSSKeyword>(0)},
        {"y1", value<SVGLength, CSSKeyword>(0)},
        {"x2", value<SVGLength, CSSKeyword>(0)},
        {"y2", value<SVGLength, CSSKeyword>(0)},
        {"opacity", value<CSSDouble>(1)},
    });

} // namespace reanimated::css
