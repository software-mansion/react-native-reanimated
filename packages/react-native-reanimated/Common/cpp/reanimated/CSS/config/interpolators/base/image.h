#pragma once

#include <reanimated/CSS/config/interpolators/base/common.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord IMAGE_INTERPOLATORS = mergeInterpolators(
    FLEX_INTERPOLATORS,
    SHADOW_INTERPOLATORS_IOS,
    TRANSFORMS_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"resizeMode", value<CSSKeyword>("cover")},
        {"backfaceVisibility", value<CSSKeyword>("visible")},
        {"borderBottomLeftRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderBottomRightRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"backgroundColor", value<CSSColor>(TRANSPARENT)},
        {"borderColor", value<CSSColor>(BLACK)},
        {"borderRadius", value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderTopLeftRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderTopRightRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"overflow", value<CSSKeyword>("visible")},
        {"overlayColor", value<CSSColor>(BLACK)},
        {"tintColor", value<CSSColor>(BLACK)},
        {"opacity", value<CSSDouble>(1)},
        {"cursor", value<CSSKeyword>("auto")},
    });

} // namespace reanimated::css
