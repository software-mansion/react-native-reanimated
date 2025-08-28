'use strict';
import type { FontVariant } from 'react-native';

import { FONT_WEIGHT_MAPPINGS } from '../../../constants';
import type { ValueProcessor } from '../types';

export const processFontWeight: ValueProcessor<number | string> = (value) => {
  if (typeof value === 'number' || !isNaN(+value)) {
    return String(value);
  }

  if (value in FONT_WEIGHT_MAPPINGS) {
    return FONT_WEIGHT_MAPPINGS[value as keyof typeof FONT_WEIGHT_MAPPINGS];
  }
};

export const processFontVariant: ValueProcessor<FontVariant[]> = (value) =>
  value.join(', ');
