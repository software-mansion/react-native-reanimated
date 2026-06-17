'use strict';
import {
  registerWebSvgPropsBuilder,
  SVG_CIRCLE_WEB_PROPERTIES_CONFIG,
  SVG_COMMON_WEB_PROPERTIES_CONFIG,
  SVG_ELLIPSE_WEB_PROPERTIES_CONFIG,
  SVG_IMAGE_WEB_PROPERTIES_CONFIG,
  SVG_PATH_WEB_PROPERTIES_CONFIG,
  SVG_RECT_WEB_PROPERTIES_CONFIG,
} from './web';

// Components that animate only the common appearance props on web: the container
// (G), and shapes whose geometry is an SVG attribute rather than a CSS property -
// Line endpoints, Pattern/Text/gradient coordinates, and Polygon/Polyline `points`
// (react-native-svg renders them as native <polygon>/<polyline>, whose `points`
// CSS cannot animate). They fall back to the shared common config.
const COMMON_ONLY_COMPONENTS = [
  'G',
  'Line',
  'Pattern',
  'Polygon',
  'Polyline',
  'Text',
  'LinearGradient',
  'RadialGradient',
] as const;

export function initSvgCssSupport() {
  registerWebSvgPropsBuilder('Circle', SVG_CIRCLE_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('Ellipse', SVG_ELLIPSE_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('Image', SVG_IMAGE_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('Path', SVG_PATH_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('Rect', SVG_RECT_WEB_PROPERTIES_CONFIG);

  for (const componentName of COMMON_ONLY_COMPONENTS) {
    registerWebSvgPropsBuilder(componentName, SVG_COMMON_WEB_PROPERTIES_CONFIG);
  }
}
