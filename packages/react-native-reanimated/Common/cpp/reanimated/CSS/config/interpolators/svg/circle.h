#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = {
    {"cx", value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"cy", value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", 0)},
    {"r", value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
};

} // namespace reanimated::css
