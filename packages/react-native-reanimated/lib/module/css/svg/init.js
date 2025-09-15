'use strict';

import { registerComponentStyleBuilder } from '../native';
import { SVG_CIRCLE_PROPERTIES_CONFIG, SVG_ELLIPSE_PROPERTIES_CONFIG, SVG_LINE_PROPERTIES_CONFIG, SVG_PATH_PROPERTIES_CONFIG, SVG_RECT_PROPERTIES_CONFIG } from './native';
export function initSvgCssSupport() {
  registerComponentStyleBuilder('RNSVGCircle', SVG_CIRCLE_PROPERTIES_CONFIG);
  registerComponentStyleBuilder('RNSVGEllipse', SVG_ELLIPSE_PROPERTIES_CONFIG);
  registerComponentStyleBuilder('RNSVGLine', SVG_LINE_PROPERTIES_CONFIG);
  registerComponentStyleBuilder('RNSVGPath', SVG_PATH_PROPERTIES_CONFIG);
  registerComponentStyleBuilder('RNSVGRect', SVG_RECT_PROPERTIES_CONFIG);

  // TODO: Add more SVG components as they are implemented
}
//# sourceMappingURL=init.js.map