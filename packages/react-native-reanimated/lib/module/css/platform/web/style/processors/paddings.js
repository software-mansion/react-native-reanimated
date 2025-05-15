'use strict';

import { parseDimensionValue } from "../../utils.js";
export const processPaddingHorizontal = value => {
  const result = parseDimensionValue(value);
  if (!result) {
    return;
  }
  return {
    paddingLeft: result,
    paddingRight: result
  };
};
export const processPaddingVertical = value => {
  const result = parseDimensionValue(value);
  if (!result) {
    return;
  }
  return {
    paddingTop: result,
    paddingBottom: result
  };
};
//# sourceMappingURL=paddings.js.map