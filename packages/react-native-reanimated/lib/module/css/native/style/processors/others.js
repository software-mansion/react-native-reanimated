'use strict';

import { ReanimatedError } from "../../../../common/index.js";
export const ERROR_MESSAGES = {
  unsupportedAspectRatio: ratio => `Unsupported aspect ratio: ${ratio}. Expected a number or a string in "a/b" format.`
};
export const processAspectRatio = value => {
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
export const processGap = value => ({
  rowGap: value,
  columnGap: value
});
//# sourceMappingURL=others.js.map