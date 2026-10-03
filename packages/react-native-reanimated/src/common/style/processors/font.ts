'use strict';
import { FONT_WEIGHT_MAPPINGS } from '../../constants';
import type { ValueProcessor } from '../../types';

export const ERROR_MESSAGES = {
  invalidFontWeight(weight: string | number) {
    'worklet';
    return `Invalid font weight value: ${weight}`;
  },
};

const VALID_FONT_WEIGHTS = new Set<string>(Object.values(FONT_WEIGHT_MAPPINGS));

export const processFontWeight: ValueProcessor<string | number, string> = (
  value
) => {
  'worklet';
  const stringValue = value.toString();

  if (VALID_FONT_WEIGHTS.has(stringValue)) {
    return stringValue;
  }

  // `in` walks the prototype chain, so plain `Object` members such as
  // 'constructor' or 'toString' would resolve to a font weight here.
  if (Object.prototype.hasOwnProperty.call(FONT_WEIGHT_MAPPINGS, stringValue)) {
    return FONT_WEIGHT_MAPPINGS[
      stringValue as keyof typeof FONT_WEIGHT_MAPPINGS
    ];
  }

  throw new Error(`[Reanimated] ${ERROR_MESSAGES.invalidFontWeight(value)}`);
};
