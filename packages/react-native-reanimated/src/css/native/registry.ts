'use strict';
import type { StyleBuilder, StyleBuilderConfig } from '../../common';
import {
  BASE_PROPERTIES_CONFIG,
  createStyleBuilder,
  ReanimatedError,
  ValueProcessorTarget,
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
  target: ValueProcessorTarget.CSS,
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
  STYLE_BUILDERS[componentName] = createStyleBuilder(config, {
    target: ValueProcessorTarget.CSS,
  });
}
