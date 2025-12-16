'use strict';
import type { PropsBuilder, PropsBuilderConfig } from '../../common';
import {
  BASE_PROPERTIES_CONFIG,
  createPropsBuilder,
  ReanimatedError,
  ValueProcessorTarget,
} from '../../common';

export const ERROR_MESSAGES = {
  propsBuilderNotFound: (componentName: string) =>
    `CSS props builder for component ${componentName} was not found`,
};

const basePropsBuilder = createPropsBuilder(BASE_PROPERTIES_CONFIG, {
  separatelyInterpolatedNestedProperties: [
    'boxShadow',
    'shadowOffset',
    'textShadowOffset',
    'transformOrigin',
  ],
  target: ValueProcessorTarget.CSS,
});

const PROPS_BUILDERS: Record<string, PropsBuilder> = {};

export function hasPropsBuilder(componentName: string): boolean {
  return !!PROPS_BUILDERS[componentName] || componentName.startsWith('RCT');
}

export function getPropsBuilder(componentName: string): PropsBuilder {
  const propsBuilder = PROPS_BUILDERS[componentName];

  if (propsBuilder) {
    return propsBuilder;
  }

  // This captures all React Native components
  if (componentName.startsWith('RCT')) {
    return basePropsBuilder;
  }

  throw new ReanimatedError(ERROR_MESSAGES.propsBuilderNotFound(componentName));
}

export function registerComponentPropsBuilder(
  componentName: string,
  config: PropsBuilderConfig
) {
  PROPS_BUILDERS[componentName] = createPropsBuilder(config, {
    target: ValueProcessorTarget.CSS,
  });
}
