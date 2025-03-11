'use strict';
import type { ColorValue } from 'react-native';

import { processColor as processColorInternal } from '../../../../../Colors';
import { ReanimatedError } from '../../../../errors';
import type { Maybe } from '../../../../types';
import type { ValueProcessor } from '../types';

export const ERROR_MESSAGES = {
  invalidColor: (color: Maybe<ColorValue>) =>
    `Invalid color value: ${String(color)}`,
};

export const processColor: ValueProcessor<ColorValue, number | string> = (
  value
) => {
  let normalizedColor: Maybe<number | string> = null;

  if (typeof value === 'string') {
    if (value === 'transparent') {
      normalizedColor = 'transparent';
    } else {
      normalizedColor = processColorInternal(value);
    }
  } else if (typeof value === 'number') {
    // case of number format 0xRRGGBBAA format needs to be re-formatted
    normalizedColor = processColorInternal(
      `#${String(value).padStart(8, '0')}`
    );
  }

  if (!normalizedColor && normalizedColor !== 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  return normalizedColor;
};
