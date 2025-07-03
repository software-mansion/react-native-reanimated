#pragma once

#include <reanimated/CSS/config/interpolators/base/view.h>

#include <reanimated/CSS/config/interpolators/utils.h>

namespace reanimated::css {

namespace {

// Local constants
const auto BLACK = CSSColor(0, 0, 0, 255);
const auto TRANSPARENT = CSSColor::Transparent;

} // namespace

// Export the View interpolators as a constant
const InterpolatorFactoriesRecord PARAGRAPH_INTERPOLATORS = mergeInterpolators(
    VIEW_INTERPOLATORS,
    {
        /**
         * Appearance
         */
        // COLORS
        {"color", value<CSSColor>(BLACK)},
        {"textDecorationColor", value<CSSColor>(BLACK)},
        {"textShadowColor", value<CSSColor>(BLACK)},
    });

} // namespace reanimated::css
