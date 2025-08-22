'use strict';
import { ReanimatedError } from '../../common';
import type { StyleBuilder, StyleBuilderConfig } from './style';
import { BASE_PROPERTIES_CONFIG, createStyleBuilder } from './style';

export const ERROR_MESSAGES = {
  styleBuilderNotFound: (componentName: string) =>
    `CSS style builder for component ${componentName} was not found`,
};

const baseStyleBuilder = createStyleBuilder(BASE_PROPERTIES_CONFIG, {
  separatelyInterpolatedArrayProperties: ['transformOrigin', 'boxShadow'],
});

const STYLE_BUILDERS: Record<string, StyleBuilder> = {};

export function hasStyleBuilder(componentName: string): boolean {
  return !!STYLE_BUILDERS[componentName] || componentName.startsWith('RCT');
}

export function getStyleBuilder(componentName: string): StyleBuilder {
  const styleBuilder = STYLE_BUILDERS[componentName];

  if (styleBuilder) {
    return styleBuilder;
  }

  // This captures all React Native components
  if (componentName.startsWith('RCT')) {
    return baseStyleBuilder;
  }

  throw new ReanimatedError(ERROR_MESSAGES.styleBuilderNotFound(componentName));
}

export function registerComponentStyleBuilder(
  componentName: string,
  config: StyleBuilderConfig
) {
  STYLE_BUILDERS[componentName] = createStyleBuilder(config);
}
