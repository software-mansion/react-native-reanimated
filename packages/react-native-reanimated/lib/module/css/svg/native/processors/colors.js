'use strict';

import { processColor } from "../../../native/index.js";
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