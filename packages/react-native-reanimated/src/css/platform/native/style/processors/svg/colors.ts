'use strict';
import type { ColorValue } from 'react-native';

import type { ValueProcessor } from '../../types';
import { processColor } from '../base';

export const processColorSVG: ValueProcessor<
  ColorValue | number,
  number | string
> = (value) => {
  if (value === 'currentColor') {
    return 'currentColor';
  }

  return processColor(value);
};
