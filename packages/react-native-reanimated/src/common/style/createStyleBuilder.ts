'use strict';
import type { ConfigPropertyAlias, ValueProcessor } from '../types';
import type { AnyRecord } from '../types/helpers';
import { hasSuffix, isConfigPropertyAlias, kebabizeCamelCase } from '../utils';
import { BASE_PROPERTIES_CONFIG as WEB_BASE_PROPERTIES_CONFIG } from '../web/style/config';
import type { RuleBuilder } from '../web/style/types';
import { BASE_PROPERTIES_CONFIG } from './config';

type StyleBuilderConfig<TConfigValue, TBuildResult, TContext> = {
  config: Record<string, TConfigValue>;
  process: (params: {
    configValue: TConfigValue;
    config: Record<string, TConfigValue>;
    ctx: TContext;
  }) => ((value: unknown) => unknown) | TConfigValue | undefined;
  build: (props: Record<string, unknown>) => TBuildResult;
} & { ctx: TContext };

function createStyleBuilder<TConfigValue, TBuildResult, TContext = never>({
  config,
  ctx,
  process,
  build,
}: StyleBuilderConfig<TConfigValue, TBuildResult, TContext>) {
  const context = ctx ?? ({} as TContext);

  const processedConfig = Object.entries(config).reduce<
    Record<string, (value: unknown) => unknown>
  >((acc, [key, configValue]) => {
    let processedEntry = process({ configValue, config, ctx: context });

    while (processedEntry && typeof processedEntry !== 'function') {
      processedEntry = process({
        configValue: processedEntry,
        config,
        ctx: context,
      });
    }

    if (processedEntry) {
      acc[key] = processedEntry as (value: unknown) => unknown;
    }

    return acc;
  }, {});

  return {
    build(props: Record<string, unknown>, includeUndefined = false) {
      const processedProps: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(props)) {
        const processedValue = processedConfig[key](value);
        if (includeUndefined || processedValue !== undefined) {
          processedProps[key] = processedValue;
        }
      }

      return build(processedProps);
    },
  };
}

function createRuleBuilder<TConfigValue, TBuildResult, TContext = never>({});

// <<<<<<< NATIVE STYLE BUILDER >>>>>>>

const hasValueProcessor = (
  configValue: unknown
): configValue is { process: ValueProcessor<unknown> } =>
  typeof configValue === 'object' &&
  configValue !== null &&
  'process' in configValue;

const nativeStyleBuilder = createStyleBuilder({
  config: BASE_PROPERTIES_CONFIG,
  process: ({ configValue, config }) => {
    if (configValue === true) {
      return (value) => String(value);
    }
    if (isConfigPropertyAlias(configValue)) {
      return config[configValue.as];
    }
    if (hasValueProcessor(configValue)) {
      return (value) => configValue.process(value);
    }
  },
  build: (props) => props,
});

// <<<<<<< WEB STYLE BUILDER >>>>>>>

const isRuleBuilder = <P extends AnyRecord>(
  value: unknown
): value is RuleBuilder<P> => value instanceof RuleBuilderImpl;

const webStyleBuilder = createStyleBuilder({
  config: WEB_BASE_PROPERTIES_CONFIG,
  ctx: {
    ruleBuildersSet: new Set<RuleBuilder<AnyRecord>>(),
  },
  process: ({ configValue, config, ctx }) => {
    if (configValue === true) {
      return (value) => String(value);
    }
    if (typeof configValue === 'string') {
      return (value) =>
        hasSuffix(value) ? value : `${String(value)}${configValue}`;
    }
    if (isConfigPropertyAlias(configValue)) {
      return config[configValue.as];
    }
    if (hasValueProcessor(configValue)) {
      return (value) => configValue.process(value);
    }
    if (isRuleBuilder(configValue)) {
      return (value) => {
        ctx.ruleBuildersSet.add(configValue);
        configValue.add(value);
      };
    }
  },
  build: (props) => {
    const entries = Object.entries(props);

    if (entries.length === 0) {
      return null;
    }

    return entries
      .map(([key, value]) => `${kebabizeCamelCase(key)}: ${String(value)}`)
      .join('; ');
  },
});
