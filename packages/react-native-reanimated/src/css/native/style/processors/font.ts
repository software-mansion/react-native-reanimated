'use strict';
import { ReanimatedError } from '../../../../common';
import { FONT_WEIGHT_MAPPINGS } from '../../../constants';
import type { ValueProcessor } from '../types';

const ERROR_MESSAGES = {
  invalidFontWeight: (weight: string | number) =>
    `Invalid font weight value: ${weight}`,
};

export const processFontWeight: ValueProcessor<string | number> = (value) => {
  if (typeof value === 'number' || !isNaN(+value)) {
    return value.toString();
  }

  if (value in FONT_WEIGHT_MAPPINGS) {
    return FONT_WEIGHT_MAPPINGS[value as keyof typeof FONT_WEIGHT_MAPPINGS];
  }

  throw new ReanimatedError(ERROR_MESSAGES.invalidFontWeight(value));
};
