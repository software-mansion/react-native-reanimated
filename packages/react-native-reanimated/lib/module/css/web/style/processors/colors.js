'use strict';

import { convertToRGBA, rgbaArrayToRGBAColor } from '../../../../Colors';
import { isNumber } from '../../../utils';
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