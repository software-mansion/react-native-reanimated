#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <reanimated/CSS/config/interpolators/constants.h>
#include <reanimated/CSS/config/interpolators/utils.h>

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDimension.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

namespace reanimated::css {

// TODO - check if default values are correct
const InterpolatorFactoriesRecord SVG_COLOR_INTERPOLATORS = {
    {"color", value<CSSColor>(BLACK)},
};

const InterpolatorFactoriesRecord SVG_FILL_INTERPOLATORS = {
    {"fill", value<CSSColor>(BLACK)},
    {"fillOpacity", value<CSSDouble>(1)},
    {"fillRule", value<CSSKeyword>("nonzero")},
};

const InterpolatorFactoriesRecord SVG_STROKE_INTERPOLATORS = {
    {"stroke", value<CSSColor>(BLACK)},
    {"strokeWidth", value<CSSDouble>(1)},
    {"strokeOpacity", value<CSSDouble>(1)},
    {"strokeDasharray", value<CSSDouble>(0)}, // TODO - add support for array
    {"strokeDashoffset", value<CSSDouble>(0)},
    {"strokeLinecap", value<CSSKeyword>("butt")},
    {"strokeLinejoin", value<CSSKeyword>("miter")},
    {"strokeMiterlimit", value<CSSDouble>(4)},
    {"vectorEffect", value<CSSKeyword>("none")},
};

const InterpolatorFactoriesRecord SVG_CLIP_INTERPOLATORS = {
    {"clipRule", value<CSSKeyword>("nonzero")},
    // TODO - check which strings values it takes (keyword is added as a
    // placeholder here)
    {"clipPath", value<CSSKeyword>("none")},
};

const InterpolatorFactoriesRecord SVG_TRANSFORM_INTERPOLATORS = {
    {"translateX", value<CSSDimension>(RelativeTo::Parent, "width", 0)},
    {"translateY", value<CSSDimension>(RelativeTo::Parent, "height", 0)},
    {"originX", value<CSSDimension>(RelativeTo::Parent, "width", 0)},
    {"originY", value<CSSDimension>(RelativeTo::Parent, "height", 0)},
    {"scaleX", value<CSSDouble>(1)},
    {"scaleY", value<CSSDouble>(1)},
    {"skewX", value<CSSAngle>(0)},
    {"skewY", value<CSSAngle>(0)},
    {"rotation", value<CSSAngle>(0)},
};

const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS = mergeInterpolators(
    SVG_COLOR_INTERPOLATORS,
    SVG_FILL_INTERPOLATORS,
    SVG_STROKE_INTERPOLATORS);

} // namespace reanimated::css
