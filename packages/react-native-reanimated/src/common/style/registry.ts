'use strict';
import type { UnknownRecord } from '../types';
import {
  createNativePropsBuilder,
  type NativePropsBuilder,
  type PropsBuilderConfig,
  stylePropsBuilder,
} from './propsBuilder';

const DEFAULT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES = new Set<string>([
  'boxShadow',
  'shadowOffset',
  'textShadowOffset',
  'transformOrigin',
]);

type PropsBuilderEntry = {
  builder: NativePropsBuilder;
  separatelyInterpolatedNestedProperties?: ReadonlySet<string>;
};

const PROPS_BUILDERS = new Map<string, PropsBuilderEntry>();
const PATTERN_PROPS_BUILDERS: Array<{
  matcher: RegExp | ((name: string) => boolean);
  entry: PropsBuilderEntry;
}> = [];

function findEntry(compoundComponentName: string): PropsBuilderEntry | null {
  const [reactViewName] = compoundComponentName.split('$');

  const exact =
    PROPS_BUILDERS.get(compoundComponentName) ??
    PROPS_BUILDERS.get(reactViewName);
  if (exact) {
    return exact;
  }

  // Pattern matches in registration order
  for (const { matcher, entry } of PATTERN_PROPS_BUILDERS) {
    const matches =
      matcher instanceof RegExp
        ? matcher.test(compoundComponentName) || matcher.test(reactViewName)
        : matcher(compoundComponentName) || matcher(reactViewName);
    if (matches) {
      return entry;
    }
  }

  return null;
}

export function getCompoundComponentName(
  reactViewName: string,
  componentDisplayName: string
): string {
  return `${reactViewName}$${componentDisplayName}`;
}

export function getPropsBuilder(
  compoundComponentName: string
): NativePropsBuilder {
  return findEntry(compoundComponentName)?.builder ?? stylePropsBuilder;
}

export function registerComponentPropsBuilder<P extends UnknownRecord>(
  componentName: string | RegExp | ((name: string) => boolean),
  config: PropsBuilderConfig<P>,
  options: {
    separatelyInterpolatedNestedProperties?: readonly string[];
  } = {}
) {
  const entry: PropsBuilderEntry = {
    builder: createNativePropsBuilder(config),
    separatelyInterpolatedNestedProperties: options
      .separatelyInterpolatedNestedProperties?.length
      ? new Set(options.separatelyInterpolatedNestedProperties)
      : undefined,
  };

  if (typeof componentName === 'string') {
    PROPS_BUILDERS.set(componentName, entry);
  } else {
    PATTERN_PROPS_BUILDERS.push({ matcher: componentName, entry });
  }
}

export function getSeparatelyInterpolatedNestedProperties(
  compoundComponentName: string
): ReadonlySet<string> {
  return (
    findEntry(compoundComponentName)?.separatelyInterpolatedNestedProperties ??
    DEFAULT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES
  );
}
