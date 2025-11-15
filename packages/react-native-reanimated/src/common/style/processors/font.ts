'use strict';
import { FONT_WEIGHT_MAPPINGS } from '../../constants';
import { ReanimatedError } from '../../errors';
import type { ValueProcessor } from '../../types';

export const ERROR_MESSAGES = {
  invalidFontWeight: (weight: string | number) =>
    `Invalid font weight value: ${weight}`,
};

const VALID_FONT_WEIGHTS = new Set<string>(Object.values(FONT_WEIGHT_MAPPINGS));

export const processFontWeight: ValueProcessor<string | number, string> = (
  value
) => {
  const stringValue = value.toString();

  if (VALID_FONT_WEIGHTS.has(stringValue)) {
    return stringValue;
  }

  if (stringValue in FONT_WEIGHT_MAPPINGS) {
    return FONT_WEIGHT_MAPPINGS[
      stringValue as keyof typeof FONT_WEIGHT_MAPPINGS
    ];
  }

  throw new ReanimatedError(ERROR_MESSAGES.invalidFontWeight(value));
};
