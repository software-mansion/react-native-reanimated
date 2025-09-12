#include <reanimated/CSS/configs/interpolators/base/image.h>
#include <reanimated/CSS/configs/interpolators/base/view.h>

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>

#include <reanimated/CSS/configs/interpolators/constants.h>
#include <reanimated/CSS/configs/interpolators/utils.h>

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getImageInterpolators() {
  static const auto IMAGE_INTERPOLATORS = mergeInterpolators(
      getViewInterpolators(),
      InterpolatorFactoriesRecord{
          {"resizeMode", value<CSSKeyword>("cover")},
          {"overlayColor", value<CSSColor>(BLACK)},
          {"tintColor", value<CSSColor>(BLACK)},
      });
  return IMAGE_INTERPOLATORS;
}

} // namespace reanimated::css
