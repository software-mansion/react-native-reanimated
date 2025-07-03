'use strict';
import { BASE_PROPERTIES_CONFIG } from './configs';
import { SVG_CIRCLE_PROPERTIES_CONFIG } from './configs/svg';
import { createStyleBuilder } from './style';

const STYLE_BUILDERS = {
  // react-native
  base: createStyleBuilder(BASE_PROPERTIES_CONFIG, {
    separatelyInterpolatedArrayProperties: ['transformOrigin', 'boxShadow'],
  }),
  // react-native-svg
  RNSVGCircle: createStyleBuilder(SVG_CIRCLE_PROPERTIES_CONFIG),
};

export function getStyleBuilder(componentName: string | undefined) {
  if (componentName && componentName in STYLE_BUILDERS) {
    return STYLE_BUILDERS[componentName as keyof typeof STYLE_BUILDERS];
  }

  return STYLE_BUILDERS.base;
}
