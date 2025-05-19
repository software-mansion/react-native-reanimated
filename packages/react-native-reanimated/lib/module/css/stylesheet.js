'use strict';

import { CSSKeyframesRuleImpl } from "./models/index.js";
const create = styles => {
  // TODO - implement more optimizations and correctness checks in dev here
  if (__DEV__) {
    for (const key in styles) {
      if (styles[key]) {
        Object.freeze(styles[key]);
      }
    }
  }
  return styles;
};
function keyframes(
// TODO - think of better types
keyframeDefinitions) {
  return new CSSKeyframesRuleImpl(keyframeDefinitions);
}
const css = {
  create,
  keyframes
};
export { css };
//# sourceMappingURL=stylesheet.js.map