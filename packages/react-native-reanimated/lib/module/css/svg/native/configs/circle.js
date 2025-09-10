'use strict';

import { processOpacity } from "../processors/index.js";
import { commonSvgProps } from "./common.js";
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