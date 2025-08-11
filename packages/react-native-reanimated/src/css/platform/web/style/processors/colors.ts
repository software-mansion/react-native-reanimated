'use strict';
import type { ColorValue } from 'react-native';

import { convertToRGBA, rgbaArrayToRGBAColor } from '../../../../../Colors';
import { isNumber } from '../../../../utils';
import type { ValueProcessor } from '../types';

export const processColor: ValueProcessor<ColorValue> = (value) => {
  if (isNumber(value)) {
    const rgbaArray = convertToRGBA(value);
    return rgbaArrayToRGBAColor(rgbaArray);
  }

  if (typeof value !== 'string') {
    return;
  }

  if (value.startsWith('hwb')) {
    return value.replace(/\s*,\s*/g, ' ');
  }

  return value;
};
