'use strict';

import { FONT_WEIGHT_MAPPINGS } from "../../../../constants/index.js";
export const processFontWeight = value => {
  if (typeof value === 'number' || !isNaN(+value)) {
    return String(value);
  }
  if (value in FONT_WEIGHT_MAPPINGS) {
    return FONT_WEIGHT_MAPPINGS[value];
  }
};
export const processFontVariant = value => value.join(', ');
//# sourceMappingURL=font.js.map