'use strict';
import type { ColorValue } from 'react-native';

import { processColorNumber, type ValueProcessor } from '../../../../common';

export const processColorSVG: ValueProcessor<
  ColorValue | number,
  number | false | string
> = (value) => {
  const processed = processColorNumber(value);

  if (processed) {
    return processed;
  }

  if (value === 'transparent') {
    return false;
  }
  if (value === 'currentColor') {
    return 'currentColor';
  }

  return null;
};
