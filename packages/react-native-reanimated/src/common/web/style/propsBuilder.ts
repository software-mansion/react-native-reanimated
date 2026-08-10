'use strict';
import { createPropsBuilder } from '../../style';
import type { UnknownRecord } from '../../types';
import {
  hasValueProcessor,
  isConfigPropertyAlias,
  isDefined,
  kebabizeCamelCase,
  maybeAddSuffix,
} from '../../utils';
import { hasNameAlias, isRuleBuilder } from '../utils';
import { PROPERTIES_CONFIG } from './config';
import type { PropsBuilderConfig, RuleBuilder } from './types';

type WebPropsBuilderConfig<P extends UnknownRecord = UnknownRecord> =
  PropsBuilderConfig<P>;

type WebPropsBuilderOptions = {
  // Appends ' !important' to every emitted declaration (e.g. pseudo-selector
  // rules that must override the element's inline styles).
  important?: boolean;
  // Emits `<prop>: initial` for props whose input value is `undefined`
  includeUnprocessed?: boolean;
};

export type WebPropsBuilder<P extends UnknownRecord = UnknownRecord> = {
  build(props: Partial<P>, options?: WebPropsBuilderOptions): string | null;
};

export function createWebPropsBuilder<TProps extends UnknownRecord>(
  config: WebPropsBuilderConfig<TProps>
): WebPropsBuilder<TProps> {
  const usedRuleBuilders = new Set<RuleBuilder<TProps>>();
  // Maps a prop key to the CSS property it should be emitted under (e.g. a
  // Polygon's `points` is emitted as `d`).
  const nameAliases = new Map<string, string>();

  const propsBuilder = createPropsBuilder({
    config,
    processConfigValue(configValue, propertyKey) {
      // Handle true - include unchanged
      if (configValue === true) {
        return true;
      }

      // Handle false - exclude property
      if (configValue === false) {
        return;
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
        return (value) => {
          usedRuleBuilders.add(configValue);
          configValue.add(propertyKey, value as TProps[keyof TProps]);
          return;
        };
      }

      // Handle name alias (emit under a different CSS property), optionally
      // combined with a value processor.
      const isNameAlias = hasNameAlias(configValue);
      if (isNameAlias) {
        nameAliases.set(propertyKey as string, configValue.name);
      }

      // Handle value processor
      if (hasValueProcessor(configValue)) {
        return configValue.process;
      }

      if (isNameAlias) {
        return (value) => String(value);
      }
    },
  });

  return {
    build(
      props: Partial<TProps>,
      options?: WebPropsBuilderOptions
    ): string | null {
      usedRuleBuilders.clear();

      // Build props - rule builders are fed during processing
      const processedProps = propsBuilder.build(props, {
        includeUnprocessed: options?.includeUnprocessed,
      });

      // Build only used rule builders and merge their results
      for (const builder of usedRuleBuilders) {
        Object.assign(processedProps, builder.build());
      }

      // Convert to CSS string
      const importance = options?.important ? ' !important' : '';
      const cssString = Object.entries(processedProps)
        .reduce<string[]>((acc, [key, value]) => {
          const name = nameAliases.get(key) ?? key;
          if (isDefined(value)) {
            acc.push(
              `${kebabizeCamelCase(name)}: ${value as string}${importance}`
            );
          } else if (
            options?.includeUnprocessed &&
            props[key as keyof TProps] === undefined
          ) {
            acc.push(`${kebabizeCamelCase(name)}: initial${importance}`);
          }
          return acc;
        }, [])
        .join('; ');

      return cssString || null; // Return null if cssString is empty
    },
  };
}

export const webPropsBuilder = createWebPropsBuilder(PROPERTIES_CONFIG);
