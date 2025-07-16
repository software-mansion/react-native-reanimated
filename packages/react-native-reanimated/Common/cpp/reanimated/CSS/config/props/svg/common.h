#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <reanimated/CSS/config/props/constants.h>
#include <reanimated/CSS/config/props/utils.h>

#include <reanimated/CSS/values/base/CSSColor.h>
#include <reanimated/CSS/values/base/CSSDimension.h>
#include <reanimated/CSS/values/base/CSSKeyword.h>
#include <reanimated/CSS/values/base/CSSNumber.h>

#include <reanimated/CSS/values/svg/CSSStrokeDashArray.h>

#include <vector>

namespace reanimated::css {

// TODO - check if default values are correct
const InterpolatorFactoriesRecord SVG_COLOR_INTERPOLATORS = {
    {"color", value<CSSColor>(BLACK)},
};

const InterpolatorFactoriesRecord SVG_FILL_INTERPOLATORS = {
    {"fill", value<CSSColor>(BLACK)},
    {"fillOpacity", value<CSSDouble>(1)},
    {"fillRule", value<CSSInteger>(0)},
};

const InterpolatorFactoriesRecord SVG_STROKE_INTERPOLATORS = {
    {"stroke", value<CSSColor>(BLACK)},
    {"strokeWidth", value<CSSDimension>(1)},
    {"strokeOpacity", value<CSSDouble>(1)},
    {"strokeDasharray",
     value<CSSStrokeDashArray, CSSKeyword>(CSSStrokeDashArray())},
    {"strokeDashoffset", value<CSSDimension>(0)},
    {"strokeLinecap", value<CSSInteger>(0)},
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
