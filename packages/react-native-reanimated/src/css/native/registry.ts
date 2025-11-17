'use strict';
import type { StyleBuilder, StyleBuilderConfig } from '../../common';
import {
  BASE_PROPERTIES_CONFIG,
  createStyleBuilder,
  isReactComponentName,
  ReanimatedError,
} from '../../common';

export const ERROR_MESSAGES = {
  styleBuilderNotFound: (componentName: string) =>
    `CSS style builder for component ${componentName} was not found`,
};

const baseStyleBuilder = createStyleBuilder(BASE_PROPERTIES_CONFIG, {
  separatelyInterpolatedNestedProperties: [
    'boxShadow',
    'shadowOffset',
    'textShadowOffset',
    'transformOrigin',
  ],
});

const STYLE_BUILDERS: Record<string, StyleBuilder> = {};

export function hasStyleBuilder(componentName: string): boolean {
  return !!STYLE_BUILDERS[componentName] || isReactComponentName(componentName);
}

export function getStyleBuilder(componentName: string): StyleBuilder {
  const styleBuilder = STYLE_BUILDERS[componentName];

  if (styleBuilder) {
    return styleBuilder;
  }

  // This captures all React Native components
  if (isReactComponentName(componentName)) {
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
