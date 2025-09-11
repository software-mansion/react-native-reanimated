#include <reanimated/CSS/svg/configs/interpolators/common.h>

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <reanimated/CSS/configs/interpolators/constants.h>
#include <reanimated/CSS/configs/interpolators/utils.h>

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getSvgColorInterpolators() {
  // TODO - check if default values are correct
  static const InterpolatorFactoriesRecord SVG_COLOR_INTERPOLATORS = {
      {"color", value<CSSColor>(BLACK)},
  };
  return SVG_COLOR_INTERPOLATORS;
}

const InterpolatorFactoriesRecord &getSvgFillInterpolators() {
  static const InterpolatorFactoriesRecord SVG_FILL_INTERPOLATORS = {
      {"fill", value<CSSColor>(BLACK)},
      {"fillOpacity", value<CSSDouble>(1)},
      {"fillRule", value<CSSInteger>(0)},
  };
  return SVG_FILL_INTERPOLATORS;
}

const InterpolatorFactoriesRecord &getSvgStrokeInterpolators() {
  static const InterpolatorFactoriesRecord SVG_STROKE_INTERPOLATORS = {
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
  return SVG_STROKE_INTERPOLATORS;
}

const InterpolatorFactoriesRecord &getSvgClipInterpolators() {
  static const InterpolatorFactoriesRecord SVG_CLIP_INTERPOLATORS = {
      {"clipRule", value<CSSKeyword>("nonzero")},
      // TODO - check which strings values it takes (keyword is added as a
      // placeholder here)
      {"clipPath", value<CSSKeyword>("none")},
  };
  return SVG_CLIP_INTERPOLATORS;
}

const InterpolatorFactoriesRecord &getSvgTransformInterpolators() {
  static const InterpolatorFactoriesRecord SVG_TRANSFORM_INTERPOLATORS = {
      {"translateX", value<SVGLength>(0)},
      {"translateY", value<SVGLength>(0)},
      {"originX", value<SVGLength>(0)},
      {"originY", value<SVGLength>(0)},
      {"scaleX", value<CSSDouble>(1)},
      {"scaleY", value<CSSDouble>(1)},
      {"skewX", value<CSSAngle>(0)},
      {"skewY", value<CSSAngle>(0)},
      {"rotation", value<CSSAngle>(0)},
  };
  return SVG_TRANSFORM_INTERPOLATORS;
}

const InterpolatorFactoriesRecord &getSvgCommonInterpolators() {
  static const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS =
      mergeInterpolators(
          getSvgColorInterpolators(),
          getSvgFillInterpolators(),
          getSvgStrokeInterpolators());
  return SVG_COMMON_INTERPOLATORS;
}

} // namespace reanimated::css
