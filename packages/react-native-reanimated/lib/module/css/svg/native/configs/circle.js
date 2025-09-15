'use strict';

import { processOpacity } from '../processors';
import { commonSvgProps } from './common';
export const SVG_CIRCLE_PROPERTIES_CONFIG = {
  ...commonSvgProps,
  cx: true,
  cy: true,
  r: true,
  opacity: {
    process: processOpacity
  }
};
//# sourceMappingURL=circle.js.map