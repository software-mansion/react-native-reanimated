'use strict';
import type { ColorValue } from 'react-native';

import { processColor, type ValueProcessor } from '../../../native';

export const processColorSVG: ValueProcessor<
  ColorValue | number,
  number | string
> = (value) => {
  if (value === 'none') {
    return 'transparent';
  }
  if (value === 'currentColor') {
    return 'currentColor';
  }

  return processColor(value);
};
