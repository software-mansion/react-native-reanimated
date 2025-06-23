'use strict';
import type { ColorValue } from 'react-native';

import type { ValueProcessor } from '../types';

export const processColor: ValueProcessor<ColorValue> = (value) => {
  if (typeof value !== 'string') {
    return;
  }

  if (value.startsWith('hwb')) {
    return value.replace(/,/g, '');
  }

  return value;
};
