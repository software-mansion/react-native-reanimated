'use strict';
import { UNFINISHED_SVG_CSS_SUPPORT } from '../../../featureFlags/staticFlags.json';
import { BASE_PROPERTIES_CONFIG } from './configs';
import { SVG_CIRCLE_PROPERTIES_CONFIG } from './configs/svg';
import { createStyleBuilder } from './style';

const STYLE_BUILDERS = {
  // react-native / fallback
  base: createStyleBuilder(BASE_PROPERTIES_CONFIG, {
    separatelyInterpolatedArrayProperties: ['transformOrigin', 'boxShadow'],
  }),
  ...(UNFINISHED_SVG_CSS_SUPPORT && {
    // react-native-svg
    RNSVGCircle: createStyleBuilder(SVG_CIRCLE_PROPERTIES_CONFIG),
  }),
};

export function getStyleBuilder(viewName: string | undefined) {
  if (viewName && viewName in STYLE_BUILDERS) {
    return STYLE_BUILDERS[viewName as keyof typeof STYLE_BUILDERS];
  }

  // We use this as a fallback and for all react-native views as there
  // is no point in separating this config for different view types.
  return STYLE_BUILDERS.base;
}
