#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/configs/interpolators/utils.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/svg/configs/interpolators/common.h>
#include <reanimated/CSS/svg/configs/interpolators/rect.h>
#include <reanimated/CSS/svg/values/SVGLength.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_RECT_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"x", value<SVGLength, CSSKeyword>(0)},
        {"y", value<SVGLength, CSSKeyword>(0)},
        {"width", value<SVGLength, CSSKeyword>(0)},
        {"height", value<SVGLength, CSSKeyword>(0)},
        {"rx", value<SVGLength, CSSKeyword>(0)},
        {"ry", value<SVGLength, CSSKeyword>(0)},
        {"opacity", value<CSSDouble>(1)},
    });

} // namespace reanimated::css
