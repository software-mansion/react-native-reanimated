'use strict';
import type { DimensionValue } from 'react-native';

import { parseDimensionValue } from '../../../../css/web/utils';
import type { ValueProcessor } from '../types';

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
