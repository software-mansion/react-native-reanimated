'use strict';

import { processColor } from '../../../native';
export const processColorSVG = value => {
  if (value === 'none') {
    return 'transparent';
  }
  if (value === 'currentColor') {
    return 'currentColor';
  }
  return processColor(value);
};
//# sourceMappingURL=colors.js.map