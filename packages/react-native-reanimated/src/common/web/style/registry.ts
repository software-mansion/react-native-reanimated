'use strict';
import { ReanimatedError } from '../../errors';
import type { UnknownRecord } from '../../types';
import { createWebPropsBuilder } from './propsBuilder';
import type { PropsBuilderConfig } from './types';

export const ERROR_MESSAGES = {
  propsBuilderNotFound: (componentName: string) =>
    `CSS props builder for component ${componentName} was not found`,
};

// Registry for web props builders
type WebPropsBuilder = {
  build(props: UnknownRecord): string | null;
};

const DEFAULT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES = new Set<string>([
  'boxShadow',
  'textShadow',
  'transform',
  'transformOrigin',
  'filter',
]);

const COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES = new Map<
  string,
  Set<string>
>();

const PROPS_BUILDERS: Record<string, WebPropsBuilder> = {};

export function hasPropsBuilder(componentName: string): boolean {
  return !!PROPS_BUILDERS[componentName];
}

export function getPropsBuilder(componentName: string): WebPropsBuilder {
  const componentPropsBuilder = PROPS_BUILDERS[componentName];

  if (componentPropsBuilder) {
    return componentPropsBuilder;
  }

  throw new ReanimatedError(ERROR_MESSAGES.propsBuilderNotFound(componentName));
}

export function registerComponentPropsBuilder<P extends UnknownRecord>(
  componentName: string,
  config: PropsBuilderConfig<P>,
  options: {
    separatelyInterpolatedNestedProperties?: readonly string[];
  } = {}
) {
  PROPS_BUILDERS[componentName] = createWebPropsBuilder(config);

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
