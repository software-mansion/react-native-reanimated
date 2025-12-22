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
  let usedRuleBuilders = new Set<RuleBuilder<TProps>>();

  const propsBuilder = createPropsBuilder({
    config,
    processConfigValue(configValue, propertyKey) {
      // Handle false - exclude property
      if (configValue === false) {
        return undefined;
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
        // so the property doesn't appear in the regular processed props
        return (value: unknown) => {
          usedRuleBuilders.add(configValue);
          configValue.add(propertyKey, value as TProps[keyof TProps]);
          return undefined;
        };
      }

      // Handle value processor
      if (hasValueProcessor(configValue)) {
        return configValue.process;
      }

      return undefined;
    },
  });

  return {
    build(props: Partial<TProps>): string | null {
      usedRuleBuilders = new Set<RuleBuilder<TProps>>();

      // Build props - rule builders are fed during processing
      const processedProps = propsBuilder.build(props);

      // Build only used rule builders and merge their results
      const ruleBuilderProps = Array.from(usedRuleBuilders).reduce<UnknownRecord>(
        (acc, builder) => ({ ...acc, ...builder.build() }),
        {}
      );

      // Merge all props
      const allProps = { ...processedProps, ...ruleBuilderProps };

      // Convert to CSS string
      const entries = Object.entries(allProps).filter(([, value]) =>
        isDefined(value)
      );

      if (entries.length === 0) {
        return null;
      }

      return entries
        .map(([key, value]) => `${kebabizeCamelCase(key)}: ${String(value)}`)
        .join('; ');
    },
  };
}

const webPropsBuilder = createWebPropsBuilder<PlainStyle>(PROPERTIES_CONFIG);

export default webPropsBuilder;
