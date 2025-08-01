'use strict';
import { UNSTABLE_CSS_ANIMATIONS_FOR_SVG_COMPONENTS } from '../../../featureFlags/staticFlags.json';
import { BASE_PROPERTIES_CONFIG } from './configs';
import {
  SVG_CIRCLE_PROPERTIES_CONFIG,
  SVG_PATH_PROPERTIES_CONFIG,
} from './configs/svg';
import { createStyleBuilder } from './style';

const STYLE_BUILDERS = {
  // react-native / fallback
  base: createStyleBuilder(BASE_PROPERTIES_CONFIG, {
    separatelyInterpolatedArrayProperties: ['transformOrigin', 'boxShadow'],
  }),
  ...(UNSTABLE_CSS_ANIMATIONS_FOR_SVG_COMPONENTS && {
    // react-native-svg
    RNSVGCircle: createStyleBuilder(SVG_CIRCLE_PROPERTIES_CONFIG),
    RNSVGPath: createStyleBuilder(SVG_PATH_PROPERTIES_CONFIG),
  }),
};

export function getStyleBuilder(viewName = 'base') {
  return (
    STYLE_BUILDERS[viewName as keyof typeof STYLE_BUILDERS] ??
    // We use this as a fallback and for all react-native views as there
    // is no point in separating this config for different view types.
    STYLE_BUILDERS.base
  );
}
