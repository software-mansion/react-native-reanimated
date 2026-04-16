'use strict';
import type { DimensionValue } from 'react-native';

import { hasSuffix } from '../../utils';

export function parseDimensionValue(value: DimensionValue) {
  if (typeof value === 'object') {
    return;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (!hasSuffix(value)) {
    return `${value}px`;
  }

  return value;
}
