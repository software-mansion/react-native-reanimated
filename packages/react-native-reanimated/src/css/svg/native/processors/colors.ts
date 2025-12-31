'use strict';
import type { ColorValue } from 'react-native';

import { ReanimatedError, type ValueProcessor } from '../../../../common';
import { processColorNumber } from '../../../../utils';

export const ERROR_MESSAGES = {
  invalidColor: (color: unknown) =>
    `Invalid color value: ${JSON.stringify(color)}`,
};

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

  throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
};
