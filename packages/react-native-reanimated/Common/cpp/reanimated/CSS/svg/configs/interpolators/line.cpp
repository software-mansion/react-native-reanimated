#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/configs/interpolators/utils.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/svg/configs/interpolators/common.h>
#include <reanimated/CSS/svg/configs/interpolators/line.h>
#include <reanimated/CSS/svg/values/SVGLength.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getSvgLineInterpolators() {
  static const auto SVG_LINE_INTERPOLATORS = mergeInterpolators(
      getSvgCommonInterpolators(),
      InterpolatorFactoriesRecord{
          {"x1", value<SVGLength, CSSKeyword>(0)},
          {"y1", value<SVGLength, CSSKeyword>(0)},
          {"x2", value<SVGLength, CSSKeyword>(0)},
          {"y2", value<SVGLength, CSSKeyword>(0)},
          {"opacity", value<CSSDouble>(1)},
      });
  return SVG_LINE_INTERPOLATORS;
}

} // namespace reanimated::css
