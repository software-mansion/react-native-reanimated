'use strict';
import type { ColorValue } from 'react-native';

import { processColorNumber, type ValueProcessor } from '../../../../common';

export const ERROR_MESSAGES = {
  invalidColor: (color: unknown) =>
    `Invalid color value: ${JSON.stringify(color)}`,
};

export const processColorSVG: ValueProcessor<
  ColorValue | number,
  number | false | string
> = (value) => {
  const processed = processColorNumber(value);

  if (value === 'none') {
    return 0;
  }

  if (processed !== null) {
    // Same convention as the main `processColor`: the `transparent` keyword
    // becomes the `false` sentinel; explicit zero-alpha colours pass through.
    if (processed === 0 && value === 'transparent') {
      return false;
    }
    return processed;
  }

  if (value === 'currentColor') {
    return 'currentColor';
  }

  throw new Error(`[Reanimated] ${ERROR_MESSAGES.invalidColor(value)}`);
};
