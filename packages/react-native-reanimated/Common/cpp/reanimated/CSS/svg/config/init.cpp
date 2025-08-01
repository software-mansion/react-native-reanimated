#include <reanimated/CSS/svg/config/init.h>

namespace reanimated::css {

void initSvgCssSupport() {
  registerComponentInterpolators("RNSVGCircle", SVG_CIRCLE_INTERPOLATORS);
  registerComponentInterpolators("RNSVGPath", SVG_PATH_INTERPOLATORS);

  // TODO: Add more SVG components as they are implemented
}

} // namespace reanimated::css
