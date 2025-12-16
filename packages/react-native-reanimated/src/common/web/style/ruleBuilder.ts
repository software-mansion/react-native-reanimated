'use strict';
import createPropsBuilder from '../../style/createPropsBuilder';
import type { UnknownRecord } from '../../types';
import {
  hasValueProcessor,
  isConfigPropertyAlias,
  maybeAddSuffix,
} from '../../utils';
import { hasNameAlias } from '../utils';
import type { RuleBuilderConfig, RuleBuildHandler } from './types';

type ProcessedProps<P> = Record<keyof P, string>;

export function createWebRuleBuilder<TProps extends UnknownRecord>(
  config: RuleBuilderConfig<TProps>,
  buildHandler: RuleBuildHandler<TProps>
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
        nameAliases.set(String(propertyKey), configValue.name);
      }

      if (hasValueProcessor(configValue)) {
        return configValue.process;
      }

      // Boolean true or name alias without processor - both need string conversion
      if (configValue === true || isNameAlias) {
        return (value) => String(value);
      }

      return undefined;
    },
  });

  return {
    add(property: keyof TProps, value: TProps[keyof TProps]): void {
      accumulatedProps[property] = value;
    },
    build(): Record<string, string> {
      // Build all accumulated props
      const processedProps = propsBuilder.build(accumulatedProps as TProps);

      // Apply name aliases to processed props
      const propsWithAliases: Record<string, string> = {};
      for (const [key, value] of Object.entries(
        processedProps as Record<string, string>
      )) {
        const aliasedKey = nameAliases.get(key) ?? key;
        propsWithAliases[aliasedKey] = value;
      }

      // Call the handler with processed props
      const result = buildHandler(propsWithAliases as ProcessedProps<TProps>);

      // Clear accumulated props for next build
      accumulatedProps = {};

      return result;
    },
  };
}
