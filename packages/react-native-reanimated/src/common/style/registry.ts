'use strict';
import { isReactNativeViewName } from '../utils/guards';
import { ReanimatedError } from '../errors';
import type { UnknownRecord } from '../types';
import propsBuilder, {
  createNativePropsBuilder,
  type NativePropsBuilder,
  type PropsBuilderConfig,
} from './propsBuilder';

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

const PROPS_BUILDERS: Record<string, NativePropsBuilder> = {};

export function hasPropsBuilder(componentName: string): boolean {
  return !!PROPS_BUILDERS[componentName] || isReactNativeViewName(componentName);
}

export function getPropsBuilder(componentName: string): NativePropsBuilder {
  const componentPropsBuilder = PROPS_BUILDERS[componentName];

  if (componentPropsBuilder) {
    return componentPropsBuilder;
  }

  if (isReactNativeViewName(componentName)) {
    // This captures all React Native components (prefixed with RCT)
    return propsBuilder;
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
