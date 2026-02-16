'use strict';
import { ReanimatedError } from '../errors';
import type { UnknownRecord } from '../types';
import { isReactNativeViewName } from '../utils/guards';
import {
  createNativePropsBuilder,
  type NativePropsBuilder,
  type PropsBuilderConfig,
  stylePropsBuilder,
} from './propsBuilder';

export const ERROR_MESSAGES = {
  propsBuilderNotFound: (
    componentName: string,
    componentChildName?: string
  ) => {
    const compoundComponentName = getCompoundComponentName(
      componentName,
      componentChildName
    );

    const namesPart = componentChildName
      ? `${compoundComponentName} or ${componentName}`
      : componentName;

    return `CSS props builder for component ${namesPart} was not found`;
  },
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

const PROPS_BUILDERS = new Map<string, NativePropsBuilder>();

export function hasPropsBuilder(
  componentName: string,
  componentChildName?: string
): boolean {
  const compoundComponentName = getCompoundComponentName(
    componentName,
    componentChildName
  );

  return (
    !!PROPS_BUILDERS.get(compoundComponentName) ||
    !!PROPS_BUILDERS.get(componentName) ||
    isReactNativeViewName(componentName)
  );
}

export function getPropsBuilder(
  componentName: string,
  componentChildName?: string
): NativePropsBuilder {
  const compoundComponentName = getCompoundComponentName(
    componentName,
    componentChildName
  );

  const componentPropsBuilder =
    PROPS_BUILDERS.get(compoundComponentName) ??
    PROPS_BUILDERS.get(componentName);

  if (componentPropsBuilder) {
    return componentPropsBuilder;
  }

  if (isReactNativeViewName(componentName)) {
    // This captures all React Native components (prefixed with RCT)
    return stylePropsBuilder;
  }

  throw new ReanimatedError(
    ERROR_MESSAGES.propsBuilderNotFound(componentName, componentChildName)
  );
}

export function registerComponentPropsBuilder<P extends UnknownRecord>(
  componentName: string,
  config: PropsBuilderConfig<P>,
  options: {
    separatelyInterpolatedNestedProperties?: readonly string[];
    componentChildName?: string;
  } = {}
) {
  const compoundComponentName = getCompoundComponentName(
    componentName,
    options.componentChildName
  );
  PROPS_BUILDERS.set(compoundComponentName, createNativePropsBuilder(config));

  // If the generalized version is missing but a specialization is provided,
  // initialize the generalization with the default config.
  if (options.componentChildName && !hasPropsBuilder(componentName)) {
    PROPS_BUILDERS.set(componentName, createNativePropsBuilder(config));

    if (options.separatelyInterpolatedNestedProperties?.length) {
      COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES.set(
        componentName,
        new Set(options.separatelyInterpolatedNestedProperties)
      );
    }
  }

  if (options.separatelyInterpolatedNestedProperties?.length) {
    COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES.set(
      compoundComponentName,
      new Set(options.separatelyInterpolatedNestedProperties)
    );
  }
}

export function getSeparatelyInterpolatedNestedProperties(
  componentName: string,
  componentChildName?: string
): ReadonlySet<string> {
  const compoundComponentName = getCompoundComponentName(
    componentName,
    componentChildName
  );
  return (
    COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES.get(
      compoundComponentName
    ) ??
    COMPONENT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES.get(componentName) ??
    DEFAULT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES
  );
}

function getCompoundComponentName(
  componentName: string,
  componentChildName?: string
): string {
  return componentChildName
    ? `${componentName}$${componentChildName}`
    : componentName;
}
