'use strict';

import { CSSKeyframesRuleImpl } from '../platform';
import { isCSSKeyframesRule } from '../utils';
function parseAnimationName(animationName) {
  if (typeof animationName !== 'object') {
    return;
  }
  const keyframesArray = Array.isArray(animationName) ? animationName : [animationName];
  return keyframesArray.map(keyframes => isCSSKeyframesRule(keyframes) ? keyframes : new CSSKeyframesRuleImpl(keyframes));
}
export const create = styles => {
  // TODO - implement more optimizations and correctness checks in dev here

  for (const key in styles) {
    const style = styles[key];
    if (style.animationName) {
      style.animationName = parseAnimationName(style.animationName);
    }
  }
  if (__DEV__) {
    for (const key in styles) {
      Object.freeze(styles[key]);
    }
  }
  return styles;
};
//# sourceMappingURL=stylesheet.js.map