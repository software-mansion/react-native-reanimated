#pragma once

#include <reanimated/CSS/configs/interpolators/base/view.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord IMAGE_INTERPOLATORS = mergeInterpolators(
    VIEW_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"resizeMode", value<CSSKeyword>("cover")},
        {"overlayColor", value<CSSColor>(BLACK)},
        {"tintColor", value<CSSColor>(BLACK)},
    });

} // namespace reanimated::css
