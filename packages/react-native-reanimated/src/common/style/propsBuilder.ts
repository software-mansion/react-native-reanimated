'use strict';
import type {
  ConfigPropertyAlias,
  PlainStyle,
  UnknownRecord,
  ValueProcessor,
} from '../types';
import { isConfigPropertyAlias, hasValueProcessor } from '../utils';
import { BASE_PROPERTIES_CONFIG } from './config';
import createPropsBuilder from './createPropsBuilder';

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

export function createNativePropsBuilder<TProps extends UnknownRecord>(
  config: PropsBuilderConfig<TProps>
) {
  return createPropsBuilder({
    config,
    processConfigValue(configValue) {
      if (configValue === true) {
        return (value) => {
          'worklet';
          return value;
        };
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

export type NativePropsBuilder = ReturnType<typeof createNativePropsBuilder>;

const propsBuilder = createNativePropsBuilder<PlainStyle>(
  BASE_PROPERTIES_CONFIG
);

export default propsBuilder;
