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
  processConfigValue: (
    configValue: TPropsConfig[keyof TPropsConfig]
  ) => ValueProcessor | TPropsConfig[keyof TPropsConfig] | undefined;
};

export type PropsBuilderResult<TProps> = {
  build(
    props: TProps,
    options?: {
      includeUndefined?: boolean;
      target?: ValueProcessorTarget;
    }
  ): UnknownRecord;
};

export default function createPropsBuilder<
  TProps extends UnknownRecord,
  TPropsConfig extends UnknownRecord,
>({
  processConfigValue,
  config,
}: CreatePropsBuilderParams<TPropsConfig>): PropsBuilderResult<TProps> {
  const processedConfig = Object.entries(config).reduce<
    Record<string, ValueProcessor>
  >((acc, [key, configValue]) => {
    let processedValue: ReturnType<typeof processConfigValue> =
      configValue as TPropsConfig[keyof TPropsConfig];

    let depth = 0;
    while (processedValue) {
      if (++depth > MAX_PROCESS_DEPTH) {
        throw new ReanimatedError(
          `Max process depth for props builder reached for property ${key}`
        );
      }

      if (typeof processedValue === 'function') {
        acc[key] = processedValue as ValueProcessor;
        break;
      }

      processedValue = processConfigValue(processedValue);
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

      return Object.entries(props).reduce<UnknownRecord>(
        (acc, [key, value]) => {
          const processor = processedConfig[key];

          if (!processor) {
            // Props is not supported, skip it
            return acc;
          }

          const processedValue = processor(value, context);

          const valueIsRecord = isRecord(value);
          const processedValueIsRecord = isRecord(processedValue);

          if (processedValue === undefined && !includeUndefined) {
            // Skip if value is undefined and we don't want to include undefined values
            return acc;
          }

          if (processedValueIsRecord && !valueIsRecord) {
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
    },
  };
}
