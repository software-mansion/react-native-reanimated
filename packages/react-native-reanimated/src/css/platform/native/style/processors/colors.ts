'use strict';
import type { ColorValue } from 'react-native';

import { processColor as processColorInternal } from '../../../../../Colors';
import type { Maybe, ValueProcessor } from '../../../../../common';
import { ReanimatedError } from '../../../../errors';

export const ERROR_MESSAGES = {
  invalidColor: (color: Maybe<ColorValue | number>) =>
    `Invalid color value: ${String(color)}`,
};

export const processColor: ValueProcessor<
  ColorValue | number,
  number | string
> = (value) => {
  let normalizedColor: Maybe<number | string> = null;

  if (typeof value === 'string' && value === 'transparent') {
    normalizedColor = 'transparent';
  } else {
    normalizedColor = processColorInternal(value);
  }

  if (!normalizedColor && normalizedColor !== 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  return normalizedColor;
};
