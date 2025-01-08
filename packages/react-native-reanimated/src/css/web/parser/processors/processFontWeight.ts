import { FONT_WEIGHT_MAPPINGS } from '../../../normalization';
import type { ValueProcessor } from '../types';

const processFontWeight: ValueProcessor<number | string> = (value) => {
  if (typeof value === 'number' || !isNaN(+value)) {
    return String(value);
  }

  if (value in FONT_WEIGHT_MAPPINGS) {
    return FONT_WEIGHT_MAPPINGS[value as keyof typeof FONT_WEIGHT_MAPPINGS];
  }
};

export default processFontWeight;
