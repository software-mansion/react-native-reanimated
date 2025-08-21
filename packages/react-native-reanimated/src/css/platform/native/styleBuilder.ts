'use strict';
import { logger } from '../../../common';
import { EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS } from '../../../featureFlags/staticFlags.json';
import { BASE_PROPERTIES_CONFIG } from './configs';
import {
  SVG_CIRCLE_PROPERTIES_CONFIG,
  SVG_ELLIPSE_PROPERTIES_CONFIG,
  SVG_LINE_PROPERTIES_CONFIG,
  SVG_PATH_PROPERTIES_CONFIG,
  SVG_RECT_PROPERTIES_CONFIG,
} from './configs/svg';
import { createStyleBuilder } from './style';

const SVG_STYLE_BUILDERS = {
  RNSVGCircle: createStyleBuilder(SVG_CIRCLE_PROPERTIES_CONFIG),
  RNSVGEllipse: createStyleBuilder(SVG_ELLIPSE_PROPERTIES_CONFIG),
  RNSVGLine: createStyleBuilder(SVG_LINE_PROPERTIES_CONFIG),
  RNSVGPath: createStyleBuilder(SVG_PATH_PROPERTIES_CONFIG),
  RNSVGRect: createStyleBuilder(SVG_RECT_PROPERTIES_CONFIG),
};

const STYLE_BUILDERS = {
  // react-native / fallback
  base: createStyleBuilder(BASE_PROPERTIES_CONFIG, {
    separatelyInterpolatedArrayProperties: ['transformOrigin', 'boxShadow'],
  }),
  // react-native-svg
  ...(EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS && SVG_STYLE_BUILDERS),
};

export function getStyleBuilder(viewName = 'base') {
  if (
    !EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS &&
    viewName in SVG_STYLE_BUILDERS
  ) {
    logger.error(
      `Tried to use CSS animations for ${viewName}. To enable CSS animations for SVG components, please enable the EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS feature flag.`
    );
    return null;
  }

  return (
    STYLE_BUILDERS[viewName as keyof typeof STYLE_BUILDERS] ??
    // We use this as a fallback and for all react-native views as there
    // is no point in separating this config for different view types.
    STYLE_BUILDERS.base
  );
}
