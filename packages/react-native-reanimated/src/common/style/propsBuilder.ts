'use strict';
import type { ValueProcessor } from '../types';
import { isConfigPropertyAlias, isRecord } from '../utils';
import { BASE_PROPERTIES_CONFIG } from './config';
import createStyleBuilder from './createStyleBuilder';

const hasValueProcessor = (
  configValue: unknown
): configValue is { process: ValueProcessor<unknown> } =>
  isRecord(configValue) && 'process' in configValue;

// TODO - maybe rename to propsBuilder, as we have updateProps
const propsBuilder = createStyleBuilder({
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
