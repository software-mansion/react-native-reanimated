#include <reanimated/CSS/configs/interpolators/utils.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/svg/configs/interpolators/common.h>
#include <reanimated/CSS/svg/configs/interpolators/path.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getSvgPathInterpolators() {
  static const auto SVG_PATH_INTERPOLATORS = mergeInterpolators(
      getSvgCommonInterpolators(),
      // TODO - add more properties
      InterpolatorFactoriesRecord{});
  return SVG_PATH_INTERPOLATORS;
}

} // namespace reanimated::css
