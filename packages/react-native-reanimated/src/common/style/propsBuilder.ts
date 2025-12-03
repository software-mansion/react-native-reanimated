'use strict';
import type { ValueProcessor } from '../types';
import { isConfigPropertyAlias, isRecord } from '../utils';
import { BASE_PROPERTIES_CONFIG } from './config';
import createPropsBuilder from './createPropsBuilder';

const hasValueProcessor = (
  configValue: unknown
): configValue is { process: ValueProcessor<unknown> } =>
  isRecord(configValue) && 'process' in configValue;

const propsBuilder = createPropsBuilder({
  config: BASE_PROPERTIES_CONFIG,
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
      return (value) => {
        'worklet';
        return configValue.process(value);
      };
    }
  },
  buildProps: (props) => {
    'worklet';
    return props;
  },
});

export default propsBuilder;
