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

// SVG tags with no CSS-animatable geometry on web: any geometry they expose is
// an SVG attribute, not a CSS property. They fall back to the shared common config.
const COMMON_ONLY_TAGS = [
  'g',
  'line',
  'pattern',
  'polygon',
  'polyline',
  'text',
  'linearGradient',
  'radialGradient',
] as const;

export function initSvgCssSupport() {
  registerWebSvgPropsBuilder('circle', SVG_CIRCLE_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('ellipse', SVG_ELLIPSE_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('image', SVG_IMAGE_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('path', SVG_PATH_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('rect', SVG_RECT_WEB_PROPERTIES_CONFIG);

  for (const tag of COMMON_ONLY_TAGS) {
    registerWebSvgPropsBuilder(tag, SVG_COMMON_WEB_PROPERTIES_CONFIG);
  }
}
