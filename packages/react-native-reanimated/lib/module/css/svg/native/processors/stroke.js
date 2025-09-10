'use strict';

import { ReanimatedError } from "../../../../common/index.js";
import { isLength } from "../../../utils/index.js";
export const ERROR_MESSAGES = {
  invalidDashArray: value => `Invalid stroke dash array value: ${JSON.stringify(value)}`
};
export const processStrokeDashArray = value => {
  let result = [];
  if (isLength(value)) {
    result = [value];
  } else if (Array.isArray(value)) {
    // We have to repeat the same pattern twice if the number of elements is odd
    // "If the number of values is odd, the pattern behaves as if it was duplicated
    // to yield an even number of values"
    // (https://www.w3.org/TR/fill-stroke-3/#valdef-stroke-dasharray-length-percentage)
    result = value.length % 2 === 0 || value.length < 3 ? value : value.concat(value);
  } else if (value === 'none') {
    return 'none';
  } else {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDashArray(value));
  }
  if (__DEV__) {
    isValidDashArray(result);
  }
  return result;
};
const isValidDashArray = value => {
  if (!value.every(isLength)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDashArray(value));
  }
};
//# sourceMappingURL=stroke.js.map