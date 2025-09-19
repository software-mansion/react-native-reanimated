#include <reanimated/CSS/svg/configs/init.h>

#include <reanimated/CSS/configs/interpolators/registry.h>

#include <reanimated/CSS/svg/configs/interpolators/circle.h>
#include <reanimated/CSS/svg/configs/interpolators/ellipse.h>
#include <reanimated/CSS/svg/configs/interpolators/line.h>
#include <reanimated/CSS/svg/configs/interpolators/path.h>
#include <reanimated/CSS/svg/configs/interpolators/rect.h>

namespace reanimated::css {

void initSvgCssSupport() {
  registerComponentInterpolators("RNSVGCircle", getSvgCircleInterpolators());
  registerComponentInterpolators("RNSVGEllipse", getSvgEllipseInterpolators());
  registerComponentInterpolators("RNSVGLine", getSvgLineInterpolators());
  registerComponentInterpolators("RNSVGPath", getSvgPathInterpolators());
  registerComponentInterpolators("RNSVGRect", getSvgRectInterpolators());

  // TODO: Add more SVG components as they are implemented
}

} // namespace reanimated::css
