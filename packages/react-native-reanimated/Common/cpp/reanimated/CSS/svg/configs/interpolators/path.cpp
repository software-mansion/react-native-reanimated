#include <reanimated/CSS/svg/configs/interpolators/path.h>
#include <reanimated/CSS/svg/configs/interpolators/common.h>
#include <reanimated/CSS/configs/interpolators/utils.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord SVG_PATH_INTERPOLATORS = mergeInterpolators(
    SVG_COMMON_INTERPOLATORS,
    // TODO - add more properties
    InterpolatorFactoriesRecord{});

} // namespace reanimated::css
