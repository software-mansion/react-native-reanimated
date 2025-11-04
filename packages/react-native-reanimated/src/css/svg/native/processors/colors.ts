'use strict';
import type { ColorValue } from 'react-native';

import { processColor, type ValueProcessor } from '../../../../common';

export const processColorSVG: ValueProcessor<
  ColorValue | number,
  number | string
> = (value) => {
  if (value === 'currentColor') {
    return 'currentColor';
  }

  return processColor(value);
};
