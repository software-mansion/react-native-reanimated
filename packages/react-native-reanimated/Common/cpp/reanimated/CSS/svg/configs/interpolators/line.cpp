#include <reanimated/CSS/svg/configs/interpolators/line.h>
#include <reanimated/CSS/svg/configs/interpolators/common.h>
#include <reanimated/CSS/configs/interpolators/utils.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"x1", value<SVGLength, CSSKeyword>(0)},
        {"y1", value<SVGLength, CSSKeyword>(0)},
        {"x2", value<SVGLength, CSSKeyword>(0)},
        {"y2", value<SVGLength, CSSKeyword>(0)},
        {"opacity", value<CSSDouble>(1)},
    });

} // namespace reanimated::css
