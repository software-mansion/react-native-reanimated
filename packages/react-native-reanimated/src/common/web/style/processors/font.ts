'use strict';
import type { FontVariant } from 'react-native';

import { FONT_WEIGHT_MAPPINGS } from '../../../constants';
import type { ValueProcessor } from '../types';

export const processFontWeight: ValueProcessor<number | string> = (value) => {
  if (typeof value === 'number' || !isNaN(+value)) {
    return String(value);
  }

  // `in` walks the prototype chain, so plain `Object` members such as
  // 'constructor' or 'toString' would resolve to a font weight here.
  if (Object.prototype.hasOwnProperty.call(FONT_WEIGHT_MAPPINGS, value)) {
    return FONT_WEIGHT_MAPPINGS[value as keyof typeof FONT_WEIGHT_MAPPINGS];
  }
};

export const processFontVariant: ValueProcessor<
  ReadonlyArray<FontVariant> | string
  // @ts-expect-error Implementation will be fixed in the next PR
> = (value) => value.join(', ');
