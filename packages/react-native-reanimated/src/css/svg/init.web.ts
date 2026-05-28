'use strict';
import {
  registerWebSvgPropsBuilder,
  SVG_CIRCLE_WEB_PROPERTIES_CONFIG,
} from './web';

export function initSvgCssSupport() {
  registerWebSvgPropsBuilder('Circle', SVG_CIRCLE_WEB_PROPERTIES_CONFIG);
}
