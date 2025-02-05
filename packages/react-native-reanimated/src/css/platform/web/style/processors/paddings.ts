'use strict';
import type { DimensionValue } from 'react-native';

import { parseDimensionValue } from '../../utils';
import type { ValueProcessor } from '../types';

export const processPaddingHorizontal: ValueProcessor<DimensionValue> = (
  value
) => {
  const result = parseDimensionValue(value);

  if (!result) {
    return;
  }

  return {
    paddingLeft: result,
    paddingRight: result,
  };
};

export const processPaddingVertical: ValueProcessor<DimensionValue> = (
  value
) => {
  const result = parseDimensionValue(value);

  if (!result) {
    return;
  }

  return {
    paddingTop: result,
    paddingBottom: result,
  };
};
