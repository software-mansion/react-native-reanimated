#pragma once

#include <reanimated/CSS/svg/config/interpolators/common.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"cx", value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
        {"cy",
         value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", 0)},
        {"r", value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
        {"opacity", value<CSSDouble>(1)},
    });

} // namespace reanimated::css
