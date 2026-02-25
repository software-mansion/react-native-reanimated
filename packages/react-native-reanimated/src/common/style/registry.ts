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

function findEntry(
  reactViewName: string,
  jsComponentName: string
): PropsBuilderEntry | null {
  const compoundComponentName = getCompoundComponentName(
    reactViewName,
    jsComponentName
  );

  // 1. Exact component name match (check compound first, then reactViewName)
  const exact =
    PROPS_BUILDERS.get(compoundComponentName) ??
    PROPS_BUILDERS.get(reactViewName);
  if (exact) {
    return exact;
  }

  // 2. Pattern matches in registration order
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
  jsComponentName: string
): string {
  return jsComponentName
    ? `${reactViewName}$${jsComponentName}`
    : reactViewName;
}

export function getPropsBuilder(
  reactViewName: string,
  jsComponentName: string
): NativePropsBuilder {
  return (
    findEntry(reactViewName, jsComponentName)?.builder ?? stylePropsBuilder
  );
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
  reactViewName: string,
  jsComponentName: string
): ReadonlySet<string> {
  return (
    findEntry(reactViewName, jsComponentName)
      ?.separatelyInterpolatedNestedProperties ??
    DEFAULT_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES
  );
}
