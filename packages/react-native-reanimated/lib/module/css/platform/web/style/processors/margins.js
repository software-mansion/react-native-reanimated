'use strict';

import { parseDimensionValue } from "../../utils.js";
export const processMarginHorizontal = value => {
  const result = parseDimensionValue(value);
  if (!result) {
    return;
  }
  return {
    marginLeft: result,
    marginRight: result
  };
};
export const processMarginVertical = value => {
  const result = parseDimensionValue(value);
  if (!result) {
    return;
  }
  return {
    marginTop: result,
    marginBottom: result
  };
};
//# sourceMappingURL=margins.js.map