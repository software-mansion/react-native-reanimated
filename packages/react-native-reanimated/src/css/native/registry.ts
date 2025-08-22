'use strict';
import type { StyleBuilder, StyleBuilderConfig } from './style';
import { BASE_PROPERTIES_CONFIG, createStyleBuilder } from './style';

const STYLE_BUILDERS: Record<string, StyleBuilder> = {
  // react-native / fallback
  base: createStyleBuilder(BASE_PROPERTIES_CONFIG, {
    separatelyInterpolatedArrayProperties: ['transformOrigin', 'boxShadow'],
  }),
};

export function getStyleBuilder(componentName = 'base'): StyleBuilder {
  return (
    STYLE_BUILDERS[componentName] ??
    // We use this as a fallback and for all react-native components as there
    // is no point in separating this config for different component types.
    STYLE_BUILDERS.base
  );
}

export function registerComponentStyleBuilder(
  componentName: string,
  config: StyleBuilderConfig
) {
  STYLE_BUILDERS[componentName] = createStyleBuilder(config);
}
