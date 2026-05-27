'use strict';
import type {
  ConfigPropertyAlias,
  PlainStyle,
  UnknownRecord,
  ValueProcessor,
} from '../types';
import { hasValueProcessor, isConfigPropertyAlias } from '../utils';
import { STYLE_PROPERTIES_CONFIG } from './config';
import createBasePropsBuilder from './createBasePropsBuilder';

type PropsBuilderPropertyConfig<
  TProps extends UnknownRecord = UnknownRecord,
  K extends keyof TProps = keyof TProps,
> =
  | boolean // true - included, false - excluded
  | ConfigPropertyAlias<TProps> // alias for another property
  | {
      // value can have any type as it is passed to CPP where we can expect a different
      // type than in the React Native stylesheet (e.g. number for colors instead of string)
      process: ValueProcessor<Required<TProps>[K], unknown>; // for custom value processing
    };

export type PropsBuilderConfig<P extends UnknownRecord = UnknownRecord> = {
  [K in keyof Required<P>]: PropsBuilderPropertyConfig<P, K>;
};

export function createPropsBuilder<TProps extends UnknownRecord>(
  config: PropsBuilderConfig<TProps>
) {
  return createBasePropsBuilder({
    config,
    processConfigValue(configValue) {
      if (configValue === true) {
        // No custom processing needed
        return true;
      }
      if (isConfigPropertyAlias<TProps>(configValue)) {
        return config[configValue.as];
      }
      if (hasValueProcessor<ValueProcessor>(configValue)) {
        return (value, context) => {
          'worklet';
          return configValue.process(value, context);
        };
      }
    },
  });
}

export type PropsBuilder = ReturnType<typeof createPropsBuilder>;

export const defaultPropsBuilder = createPropsBuilder<PlainStyle>(
  STYLE_PROPERTIES_CONFIG
);
