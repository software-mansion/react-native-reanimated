#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <reanimated/CSS/config/interpolators/constants.h>
#include <reanimated/CSS/config/interpolators/utils.h>

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

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
    {"strokeWidth", value<SVGLength>(1)},
    {"strokeOpacity", value<CSSDouble>(1)},
    {"strokeDasharray",
     value<SVGStrokeDashArray, CSSKeyword>(SVGStrokeDashArray())},
    {"strokeDashoffset", value<SVGLength>(0)},
    {"strokeLinecap", value<CSSInteger>(0)},
    {"strokeLinejoin", value<CSSInteger>(0)},
    {"strokeMiterlimit", value<CSSDouble>(4)},
    {"vectorEffect", value<CSSInteger>(0)},
};

const InterpolatorFactoriesRecord SVG_CLIP_INTERPOLATORS = {
    {"clipRule", value<CSSKeyword>("nonzero")},
    // TODO - check which strings values it takes (keyword is added as a
    // placeholder here)
    {"clipPath", value<CSSKeyword>("none")},
};

const InterpolatorFactoriesRecord SVG_TRANSFORM_INTERPOLATORS = {
    // {"transform",
    //  transforms(
    //      {"perspective",
    //       transformOp<PerspectiveOperation>(0)}, // 0 - no perspective
    //      {"rotate", transformOp<RotateOperation>("0deg")},
    //      {"rotateX", transformOp<RotateXOperation>("0deg")},
    //      {"rotateY", transformOp<RotateYOperation>("0deg")},
    //      {"rotateZ", transformOp<RotateZOperation>("0deg")},
    //      {"scale", transformOp<ScaleOperation>(1)},
    //      {"scaleX", transformOp<ScaleXOperation>(1)},
    //      {"scaleY", transformOp<ScaleYOperation>(1)},
    //      {"translateX",
    //       transformOp<TranslateXOperation>(RelativeTo::Self, "width", 0)},
    //      {"translateY",
    //       transformOp<TranslateYOperation>(RelativeTo::Self, "height", 0)},
    //      {"skewX", transformOp<SkewXOperation>("0deg")},
    //      {"skewY", transformOp<SkewYOperation>("0deg")},
    //      {"matrix",
    //       transformOp<MatrixOperation>(TransformMatrix::Identity())})},
};

const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS = mergeInterpolators(
    SVG_COLOR_INTERPOLATORS,
    SVG_FILL_INTERPOLATORS,
    SVG_STROKE_INTERPOLATORS,
    SVG_TRANSFORM_INTERPOLATORS);

} // namespace reanimated::css
