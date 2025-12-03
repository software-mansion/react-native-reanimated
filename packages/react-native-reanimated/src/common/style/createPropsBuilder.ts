'use strict';
import { ReanimatedError } from '../errors';
import type {
  UnknownRecord,
  ValueProcessor,
  ValueProcessorContext,
} from '../types';
import { ValueProcessorTarget } from '../types';
import { isRecord } from '../utils';

const MAX_PROCESS_DEPTH = 10;

type CreatePropsBuilderParams<TPropsConfig> = {
  config: TPropsConfig;
  processConfigEntry: (params: {
    configValue: TPropsConfig[keyof TPropsConfig];
    config: TPropsConfig;
  }) => ValueProcessor | TPropsConfig[keyof TPropsConfig] | undefined;
  buildProps: (props: Readonly<UnknownRecord>) => UnknownRecord;
};

type CreateStyleBuilderResult<TProps> = {
  build(
    props: TProps,
    options?: {
      includeUndefined?: boolean;
      target?: ValueProcessorTarget;
    }
  ): UnknownRecord;
}

export default function createPropsBuilder<TProps extends UnknownRecord, TPropsConfig extends UnknownRecord>({
  processConfigEntry,
config,
}: CreatePropsBuilderParams<TPropsConfig>): CreateStyleBuilderResult<TProps> {
    const processedConfig = Object.entries(config).reduce<
      Record<string, ValueProcessor>
    >((acc, [key, configValue]) => {
      let processedEntry: ReturnType<typeof processConfigEntry> = configValue as TPropsConfig[keyof TPropsConfig];

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
      build(
        props: Readonly<UnknownRecord>,
        {
          includeUndefined = false,
          target = ValueProcessorTarget.Default,
      }: {
        includeUndefined?: boolean;
        target?: ValueProcessorTarget;
      } = {}
    ) {
      'worklet';
      const context: ValueProcessorContext = { target };
      const processed = Object.entries(props).reduce<UnknownRecord>(
        (acc, [key, value]) => {
          const processor = processedConfig[key];

          if (!processor) {
            // Props is not supported, skip it
           return acc;
          }

          const processedValue = processor(value, context);
          if (processedValue === undefined && !includeUndefined) {
            // Skip if value is undefined and we don't want to include undefined values
            return acc;
          }

          if (isRecord(processedValue)) {
            for (const processedKey in processedValue) {
              if (!(processedKey in props)) {
                acc[processedKey] = processedValue[processedKey];
              }
            }
          } else {
            acc[key] = processedValue;
          }

          return acc;
        },
        {}
      );

      return processed;
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
