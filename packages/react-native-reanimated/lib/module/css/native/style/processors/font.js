'use strict';

import { ReanimatedError } from "../../../../common/index.js";
import { FONT_WEIGHT_MAPPINGS } from "../../../constants/index.js";
const ERROR_MESSAGES = {
  invalidFontWeight: weight => `Invalid font weight value: ${weight}`
};
export const processFontWeight = value => {
  if (typeof value === 'number' || !isNaN(+value)) {
    return value.toString();
  }
  if (value in FONT_WEIGHT_MAPPINGS) {
    return FONT_WEIGHT_MAPPINGS[value];
  }
  throw new ReanimatedError(ERROR_MESSAGES.invalidFontWeight(value));
};
//# sourceMappingURL=font.js.map