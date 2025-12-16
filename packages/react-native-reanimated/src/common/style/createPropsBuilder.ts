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
    configValue: TPropsConfig[keyof TPropsConfig],
    propertyKey: keyof TPropsConfig
  ) => ValueProcessor | TPropsConfig[keyof TPropsConfig] | undefined;
};

type PropsBuilderResult<TProps> = {
  build(
    props: TProps,
    options?: {
      target?: ValueProcessorTarget;
      includeUnprocessed?: boolean;
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

      // If the value returned from the processConfigValue function is a function,
      // that means it's a terminal value that will be used to process the value
      // of the property. We can break the loop at this point.
      if (typeof processedValue === 'function') {
        acc[key] = processedValue as ValueProcessor;
        break;
      }

      // Otherwise, we need to continue processing the value.
      processedValue = processConfigValue(
        processedValue,
        key as keyof TPropsConfig
      );
    }

    return acc;
  }, {});

  return {
    build(props, options) {
      'worklet';
      const context: ValueProcessorContext = {
        target: options?.target ?? ValueProcessorTarget.Default,
      };

      return Object.entries(props).reduce<UnknownRecord>(
        (acc, [key, value]) => {
          const processor = processedConfig[key];

          // Prop is not supported or value is undefined
          if (!processor || value === undefined) {
            if (options?.includeUnprocessed) {
              acc[key] = value;
            }
            return acc;
          }

          const processedValue = processor(value, context);

          if (isRecord(processedValue) && !isRecord(value)) {
            // The value processor may return multiple values for a single property
            // as a record of new property names and processed values. In such a case,
            // we want to store properties from this record in the result object only if
            // they are not already present in the original props object (we don't want
            // override properties specified by the user).
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
