'use strict';
import type { DimensionValue } from 'react-native';

import type { ValueProcessor } from '../types';
import { parseDimensionValue } from '../utils';

export const processMarginHorizontal: ValueProcessor<DimensionValue> = (
  value
) => {
  const result = parseDimensionValue(value);

  if (!result) {
    return;
  }

  return {
    marginLeft: result,
    marginRight: result,
  };
};

export const processMarginVertical: ValueProcessor<DimensionValue> = (
  value
) => {
  const result = parseDimensionValue(value);

  if (!result) {
    return;
  }

  return {
    marginTop: result,
    marginBottom: result,
  };
};
