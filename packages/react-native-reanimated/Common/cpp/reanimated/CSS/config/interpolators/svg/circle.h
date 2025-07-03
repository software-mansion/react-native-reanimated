#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = {
    {"cx",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"cy",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"r", value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
};

} // namespace reanimated::css
