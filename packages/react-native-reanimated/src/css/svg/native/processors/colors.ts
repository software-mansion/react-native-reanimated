'use strict';
import type { ColorValue } from 'react-native';

import { type ValueProcessor } from '../../../../common';
import { processColor } from '../../../native';

export const processColorSVG: ValueProcessor<
  ColorValue | number,
  number | string
> = (value) => {
  if (value === 'currentColor') {
    return 'currentColor';
  }

  return processColor(value);
};
