'use strict';
import { createPropsBuilder } from '../../style';
import type { UnknownRecord } from '../../types';
import {
  hasValueProcessor,
  isConfigPropertyAlias,
  maybeAddSuffix,
} from '../../utils';
import { hasNameAlias } from '../utils';
import type { RuleBuilderConfig, RuleBuildHandler } from './types';

type ProcessedProps<P> = Record<keyof P, string>;

export function createWebRuleBuilder<
  TProps extends UnknownRecord,
  TResult = Record<string, string>,
>(
  config: RuleBuilderConfig<TProps>,
  buildHandler: RuleBuildHandler<TProps, TResult>
) {
  // Accumulate props across add() calls
  let accumulatedProps: Partial<TProps> = {};
  // Track name aliases for custom property names
  const nameAliases = new Map<string, string>();

  const propsBuilder = createPropsBuilder({
    config,
    processConfigValue(configValue, propertyKey) {
      // Handle suffix config (e.g., 'px')
      if (typeof configValue === 'string') {
        return (value) => maybeAddSuffix(value, configValue);
      }

      // Handle property alias
      if (isConfigPropertyAlias<TProps>(configValue)) {
        return config[configValue.as];
      }

      // Handle name alias and/or value processor
      const isNameAlias = hasNameAlias(configValue);
      if (isNameAlias) {
        nameAliases.set(propertyKey as string, configValue.name);
      }

      if (hasValueProcessor(configValue)) {
        return configValue.process;
      }

      // Boolean true or name alias without processor - both need string conversion
      if (configValue === true || isNameAlias) {
        return (value) => String(value);
      }
    },
  });

  return {
    add(property: keyof TProps, value: TProps[keyof TProps]): void {
      accumulatedProps[property] = value;
    },
    build(): TResult {
      // Clear accumulated props for next build
      accumulatedProps = {};

      // Build all accumulated props
      let processedProps = propsBuilder.build(accumulatedProps as TProps);

      // Apply name aliases to processed props
      if (nameAliases.size) {
        processedProps = Object.fromEntries(
          Object.entries(processedProps).map(([key, value]) => [
            nameAliases.get(key) ?? key,
            value,
          ])
        );
      }

      // Call the handler with processed props
      return buildHandler(processedProps as ProcessedProps<TProps>);
    },
  };
}
