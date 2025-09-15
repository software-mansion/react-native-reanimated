'use strict';

import { processColor as processColorInternal, ReanimatedError } from '../../../../common';
export const ERROR_MESSAGES = {
  invalidColor: color => `Invalid color value: ${String(color)}`
};
export const processColor = value => {
  let normalizedColor = null;
  if (typeof value === 'string' && value === 'transparent') {
    normalizedColor = 'transparent';
  } else {
    normalizedColor = processColorInternal(value);
  }
  if (!normalizedColor && normalizedColor !== 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }
  return normalizedColor;
};
//# sourceMappingURL=colors.js.map