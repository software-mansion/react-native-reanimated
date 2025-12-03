'use strict';
import {
  BASE_PROPERTIES_CONFIG,
  ReanimatedError,
  createNativePropsBuilder,
} from '../../common';
import type { PropsBuilderConfig } from '../../common';

export const ERROR_MESSAGES = {
  propsBuilderNotFound: (componentName: string) =>
    `CSS props builder for component ${componentName} was not found`,
};

const DEFAULT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES = new Set<string>([
  'boxShadow',
  'shadowOffset',
  'textShadowOffset',
  'transformOrigin',
]);

const COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES = new Map<
  string,
  Set<string>
>();

const basePropsBuilder = createNativePropsBuilder(BASE_PROPERTIES_CONFIG);

const PROPS_BUILDERS: Record<string, ReturnType<typeof createNativePropsBuilder>> = {};

export function hasPropsBuilder(componentName: string): boolean {
  return !!PROPS_BUILDERS[componentName] || componentName.startsWith('RCT');
}

export function getPropsBuilder(componentName: string) {
  const propsBuilder = PROPS_BUILDERS[componentName];

  if (propsBuilder) {
    return propsBuilder;
  }

  if (componentName.startsWith('RCT')) {
    // This captures all React Native components (prefixed with RCT)
    return basePropsBuilder;
  }

  throw new ReanimatedError(ERROR_MESSAGES.propsBuilderNotFound(componentName));
}

export function registerComponentPropsBuilder(
  componentName: string,
  config: PropsBuilderConfig,
  options: {
    separatelyInterpolatedNestedProperties?: readonly string[];
  } = {}
) {
  PROPS_BUILDERS[componentName] = createNativePropsBuilder(config);

  if (options.separatelyInterpolatedNestedProperties?.length) {
    COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES.set(
      componentName,
      new Set(options.separatelyInterpolatedNestedProperties)
    );
  }
}

export function getSeparatelyInterpolatedNestedProperties(
  componentName: string
): ReadonlySet<string> {
  return (
    COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES.get(componentName) ??
    DEFAULT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES
  );
}
