'use strict';
import { createPropsBuilder } from '../../style';
import type { PlainStyle, UnknownRecord } from '../../types';
import {
  hasValueProcessor,
  isConfigPropertyAlias,
  isDefined,
  kebabizeCamelCase,
  maybeAddSuffix,
} from '../../utils';
import { isRuleBuilder } from '../utils';
import { PROPERTIES_CONFIG } from './config';
import type { PropsBuilderConfig, RuleBuilder } from './types';

type WebPropsBuilderConfig<P extends UnknownRecord = UnknownRecord> =
  PropsBuilderConfig<P>;

export function createWebPropsBuilder<TProps extends UnknownRecord>(
  config: WebPropsBuilderConfig<TProps>
) {
  const usedRuleBuilders = new Set<RuleBuilder<TProps>>();

  const propsBuilder = createPropsBuilder({
    config,
    processConfigValue(configValue, propertyKey) {
      // Handle false - exclude property
      if (configValue === false) {
        return;
      }

      // Handle true - include as string
      if (configValue === true) {
        return (value) => String(value);
      }

      // Handle suffix (e.g., 'px')
      if (typeof configValue === 'string') {
        return (value) => maybeAddSuffix(value, configValue);
      }

      // Handle property alias
      if (isConfigPropertyAlias<TProps>(configValue)) {
        return config[configValue.as];
      }

      // Handle rule builders - store reference and return marker
      if (isRuleBuilder<TProps>(configValue)) {
        // Return a processor that feeds values to the rule builder and returns undefined
        // so the property doesn't appear in the regular processed props (only the result
        // of the rule builder will appear in the final style)
        return (value: unknown) => {
          usedRuleBuilders.add(configValue);
          configValue.add(propertyKey, value as TProps[keyof TProps]);
          return;
        };
      }

      // Handle value processor
      if (hasValueProcessor(configValue)) {
        return configValue.process;
      }
    },
  });

  return {
    build(props: Partial<TProps>): string | null {
      usedRuleBuilders.clear();

      // Build props - rule builders are fed during processing
      const processedProps = propsBuilder.build(props);

      // Build only used rule builders and merge their results
      for (const builder of usedRuleBuilders) {
        Object.assign(processedProps, builder.build());
      }

      // Convert to CSS string
      const cssString = Object.entries(processedProps)
        .reduce<string[]>((acc, [key, value]) => {
          if (isDefined(value)) {
            acc.push(`${kebabizeCamelCase(key)}: ${value as string}`);
          }
          return acc;
        }, [])
        .join('; ');

      return cssString || null; // Return null if cssString is empty
    },
  };
}

const webPropsBuilder = createWebPropsBuilder<PlainStyle>(PROPERTIES_CONFIG);

export default webPropsBuilder;
