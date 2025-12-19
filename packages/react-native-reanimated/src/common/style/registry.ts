'use strict';
import type { UnknownRecord } from '../types';
import propsBuilder, {
  createNativePropsBuilder,
  type NativePropsBuilder,
  type PropsBuilderConfig,
} from './propsBuilder';
import { createRegistry } from '../registry';

export { ERROR_MESSAGES } from '../registry';

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

export const registry = createRegistry<NativePropsBuilder>({
  basePropsBuilder: propsBuilder,
});

export function registerComponentPropsBuilder<P extends UnknownRecord>(
  componentName: string,
  config: PropsBuilderConfig<P>,
  options: {
    separatelyInterpolatedNestedProperties?: readonly string[];
  } = {}
) {
  const builder = createNativePropsBuilder(config);
  registry.registerBuilder(componentName, builder);

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
