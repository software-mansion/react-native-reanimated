#include <reanimated/CSS/svg/config/init.h>

namespace reanimated::css {

void initSvgCssSupport() {
  // Register SVG Circle interpolators
  registerComponentInterpolators("RNSVGCircle", SVG_CIRCLE_INTERPOLATORS);

  // TODO: Add more SVG components as they are implemented
}

} // namespace reanimated::css
