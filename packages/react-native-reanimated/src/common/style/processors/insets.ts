'use strict';
import type { DimensionValue } from 'react-native';

import type { ValueProcessor } from '../../types';

type InsetProcessor = ValueProcessor<
  DimensionValue,
  Record<string, DimensionValue>
>;

export const processInset: InsetProcessor = (value) => {
  'worklet';
  return {
    top: value,
    bottom: value,
    left: value,
    right: value,
  };
};

export const processInsetBlock: InsetProcessor = (value) => {
  'worklet';
  return {
    top: value,
    bottom: value,
  };
};

export const processInsetInline: InsetProcessor = (value) => {
  'worklet';
  return {
    left: value,
    right: value,
  };
};
