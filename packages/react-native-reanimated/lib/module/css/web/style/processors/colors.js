'use strict';

import { convertToRGBA, rgbaArrayToRGBAColor } from "../../../../Colors.js";
import { isNumber } from "../../../utils/index.js";
export const processColor = value => {
  if (isNumber(value)) {
    const rgbaArray = convertToRGBA(value);
    return rgbaArrayToRGBAColor(rgbaArray);
  }
  if (typeof value !== 'string') {
    return;
  }
  if (value.startsWith('hwb')) {
    return value.replace(/\s*,\s*/g, ' ');
  }
  return value;
};
//# sourceMappingURL=colors.js.map