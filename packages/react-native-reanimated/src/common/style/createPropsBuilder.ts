'use strict';
import { ReanimatedError } from '../errors';
import type { ReadonlyRecord, UnknownRecord, ValueProcessor } from '../types';

const MAX_PROCESS_DEPTH = 10;

type PropsBuilderConfig<TConfigValue, TBuildResult> = {
  config: ReadonlyRecord<string, TConfigValue>;
  processConfigEntry: (params: {
    configValue: TConfigValue;
    config: ReadonlyRecord<string, TConfigValue>;
    // ctx: TConfigContext;
  }) => ValueProcessor | TConfigValue | undefined;
  buildProps: (props: Readonly<UnknownRecord>) => TBuildResult;
};

//& { ctx: TConfigContext };

export default function createPropsBuilder<TConfigValue, TBuildResult>({
  config,
  processConfigEntry,
  buildProps,
}: PropsBuilderConfig<TConfigValue, TBuildResult>) {
  const processedConfig = Object.entries(config).reduce<
    Record<string, (value: unknown) => unknown>
  >((acc, [key, configValue]) => {
    let processedEntry: ReturnType<typeof processConfigEntry> = configValue;

    let depth = 0;
    do {
      if (++depth > MAX_PROCESS_DEPTH) {
        throw new ReanimatedError(
          `Max process depth for props builder reached for property ${key}`
        );
      }
      processedEntry = processConfigEntry({
        configValue: processedEntry,
        config,
      });
    } while (processedEntry && typeof processedEntry !== 'function');

    if (processedEntry) {
      acc[key] = processedEntry as ValueProcessor;
    }

    return acc;
  }, {});

  return {
    build(props: Readonly<UnknownRecord>, includeUndefined = false) {
      'worklet';
      return buildProps(
        Object.entries(props).reduce<UnknownRecord>((acc, [key, value]) => {
          const processedValue = processedConfig[key](value); // TODO - add value processor context
          if (includeUndefined || processedValue !== undefined) {
            acc[key] = processedValue;
          }
          return acc;
        }, {})
      );
    },
  };
}

// // <<<<<<< WEB STYLE BUILDER >>>>>>>

// const isRuleBuilder = <P extends AnyRecord>(
//   value: unknown
// ): value is RuleBuilder<P> => value instanceof RuleBuilderImpl;

// const webStyleBuilder = createStyleBuilder({
//   config: WEB_BASE_PROPERTIES_CONFIG,
//   ctx: {
//     ruleBuildersSet: new Set<RuleBuilder<UnknownRecord>>(),
//   },
//   process: ({ configValue, config, ctx }) => {
//     if (configValue === true) {
//       return (value) => String(value);
//     }
//     if (typeof configValue === 'string') {
//       return (value) =>
//         hasSuffix(value) ? value : `${String(value)}${configValue}`;
//     }
//     if (isConfigPropertyAlias(configValue)) {
//       return config[configValue.as];
//     }
//     if (hasValueProcessor(configValue)) {
//       return (value) => configValue.process(value);
//     }
//     if (isRuleBuilder(configValue)) {
//       return (value) => {
//         ctx.ruleBuildersSet.add(configValue);
//         configValue.add(value);
//       };
//     }
//   },
//   build: (props) => {
//     const entries = Object.entries(props);

//     if (entries.length === 0) {
//       return null;
//     }

//     return entries
//       .map(([key, value]) => `${kebabizeCamelCase(key)}: ${String(value)}`)
//       .join('; ');
//   },
// });
