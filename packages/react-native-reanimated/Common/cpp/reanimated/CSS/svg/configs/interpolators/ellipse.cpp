#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/configs/interpolators/utils.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/svg/configs/interpolators/common.h>
#include <reanimated/CSS/svg/configs/interpolators/ellipse.h>
#include <reanimated/CSS/svg/values/SVGLength.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getSvgEllipseInterpolators() {
  static const auto SVG_ELLIPSE_INTERPOLATORS = mergeInterpolators(
      getSvgCommonInterpolators(),
      InterpolatorFactoriesRecord{
          {"cx", value<SVGLength, CSSKeyword>(0)},
          {"cy", value<SVGLength, CSSKeyword>(0)},
          {"rx", value<SVGLength, CSSKeyword>(0)},
          {"ry", value<SVGLength, CSSKeyword>(0)},
          {"opacity", value<CSSDouble>(1)},
      });
  return SVG_ELLIPSE_INTERPOLATORS;
}

} // namespace reanimated::css
