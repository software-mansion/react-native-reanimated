#include <reanimated/CSS/svg/configs/init.h>

namespace reanimated::css {

void initSvgCssSupport() {
  registerComponentInterpolators("RNSVGCircle", SVG_CIRCLE_INTERPOLATORS);
  registerComponentInterpolators("RNSVGEllipse", SVG_ELLIPSE_INTERPOLATORS);
  registerComponentInterpolators("RNSVGLine", SVG_LINE_INTERPOLATORS);
  registerComponentInterpolators("RNSVGPath", SVG_PATH_INTERPOLATORS);
  registerComponentInterpolators("RNSVGRect", SVG_RECT_INTERPOLATORS);

  // TODO: Add more SVG components as they are implemented
}

} // namespace reanimated::css
