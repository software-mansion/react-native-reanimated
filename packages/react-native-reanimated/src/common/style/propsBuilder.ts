'use strict';
import { ConfigPropertyAlias, PlainStyle, UnknownRecord, type ValueProcessor } from '../types';
import { isConfigPropertyAlias, isRecord } from '../utils';
import { BASE_PROPERTIES_CONFIG } from './config';
import createPropsBuilder from './createPropsBuilder';

const hasValueProcessor = (
  configValue: unknown
): configValue is { process: ValueProcessor<unknown> } =>
  isRecord(configValue) && 'process' in configValue;

type PropsBuilderPropertyConfig<
  TProps extends UnknownRecord = UnknownRecord,
  K extends keyof TProps = keyof TProps,
> =
  | boolean // true - included, false - excluded
  | ConfigPropertyAlias<TProps> // alias for another property
  | {
      // value can have any type as it is passed to CPP where we can expect a different
      // type than in the React Native stylesheet (e.g. number for colors instead of string)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      process: ValueProcessor<Required<TProps>[K], any>; // for custom value processing
  };

export function createNativePropsBuilder<TProps extends UnknownRecord>(
  config: Required<{ [K in keyof TProps]: PropsBuilderPropertyConfig<TProps, K> }>
) {
  return createPropsBuilder<TProps, typeof config>({
    config,
    processConfigEntry: ({ configValue, config }) => {
      if (configValue === true) {
        return (value) => {
          'worklet';
          return value;
        };
      }
      if (isConfigPropertyAlias(configValue)) {
        return config[configValue.as];
      }
      if (hasValueProcessor(configValue)) {
        return (value, context) => {
          'worklet';
          return configValue.process(value, context);
        };
      }
    },
  });
}



// = createPropsBuilder({
//   processConfigEntry: ({ configValue, config }) => {
//     if (configValue === true) {
//       return (value) => {
//         'worklet';
//         return value;
//       };
//     }
//     if (isConfigPropertyAlias(configValue)) {
//       return config[configValue.as];
//     }
//     if (hasValueProcessor(configValue)) {
//       return (value, context) => {
//         'worklet';
//         return configValue.process(value, context);
//       };
//     }
//   },
//   buildProps: (props) => {
//     'worklet';
//     return props;
//   },
// });

const propsBuilder = createNativePropsBuilder<PlainStyle>(BASE_PROPERTIES_CONFIG);

export default propsBuilder;
