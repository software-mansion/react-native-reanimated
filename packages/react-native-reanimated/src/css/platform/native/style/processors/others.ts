'use strict';
import { ReanimatedError } from '../../../../errors';
import type { ValueProcessor } from '../types';

export const ERROR_MESSAGES = {
  unsupportedAspectRatio: (ratio: string | number) =>
    `Unsupported aspect ratio: ${ratio}. Expected a number or a string in "a/b" format.`,
};

export const processAspectRatio: ValueProcessor<number | string> = (value) => {
  if (typeof value === 'number' || !isNaN(+value)) {
    return +value;
  } else if (typeof value === 'string') {
    const parts = value.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
  }

  throw new ReanimatedError(ERROR_MESSAGES.unsupportedAspectRatio(value));
};

export const processGap: ValueProcessor<number | string> = (value) => ({
  rowGap: value,
  columnGap: value,
});
