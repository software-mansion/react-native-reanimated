'use strict';
import {
  getCompoundComponentName,
  registerComponentPropsBuilder,
} from '../../common';
import {
  SVG_CIRCLE_PROPERTIES_CONFIG,
  SVG_COMMON_PROPERTIES_CONFIG,
  SVG_ELLIPSE_PROPERTIES_CONFIG,
  SVG_IMAGE_PROPERTIES_CONFIG,
  SVG_LINE_PROPERTIES_CONFIG,
  SVG_LINEAR_GRADIENT_PROPERTIES_CONFIG,
  SVG_PATH_PROPERTIES_CONFIG,
  SVG_POLYGON_PROPERTIES_CONFIG,
  SVG_POLYLINE_PROPERTIES_CONFIG,
  SVG_RADIAL_GRADIENT_PROPERTIES_CONFIG,
  SVG_RECT_PROPERTIES_CONFIG,
  SVG_TEXT_PROPERTIES_CONFIG,
} from './native';

export function initSvgCssSupport() {
  registerComponentPropsBuilder('RNSVGCircle', SVG_CIRCLE_PROPERTIES_CONFIG);
  registerComponentPropsBuilder('RNSVGEllipse', SVG_ELLIPSE_PROPERTIES_CONFIG);
  registerComponentPropsBuilder('RNSVGImage', SVG_IMAGE_PROPERTIES_CONFIG);
  registerComponentPropsBuilder('RNSVGLine', SVG_LINE_PROPERTIES_CONFIG);
  registerComponentPropsBuilder(
    'RNSVGLinearGradient',
    SVG_LINEAR_GRADIENT_PROPERTIES_CONFIG
  );
  registerComponentPropsBuilder(
    'RNSVGRadialGradient',
    SVG_RADIAL_GRADIENT_PROPERTIES_CONFIG
  );
  registerComponentPropsBuilder('RNSVGPath', SVG_PATH_PROPERTIES_CONFIG);
  registerComponentPropsBuilder(
    getCompoundComponentName('RNSVGPath', 'Polygon'),
    SVG_POLYGON_PROPERTIES_CONFIG
  );
  registerComponentPropsBuilder(
    getCompoundComponentName('RNSVGPath', 'Polyline'),
    SVG_POLYLINE_PROPERTIES_CONFIG
  );
  registerComponentPropsBuilder('RNSVGRect', SVG_RECT_PROPERTIES_CONFIG);
  registerComponentPropsBuilder('RNSVGText', SVG_TEXT_PROPERTIES_CONFIG);

  // Fallback for all SVG components that aren't explicitly registered
  registerComponentPropsBuilder(/^RNSVG/, SVG_COMMON_PROPERTIES_CONFIG);
}
