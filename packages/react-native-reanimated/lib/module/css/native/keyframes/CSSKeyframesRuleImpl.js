'use strict';

import { CSSKeyframesRuleBase } from '../../models';
import { normalizeAnimationKeyframes } from '../normalization';
import { getStyleBuilder } from '../registry';
export default class CSSKeyframesRuleImpl extends CSSKeyframesRuleBase {
  normalizedKeyframesCache_ = {};
  constructor(keyframes, cssText) {
    super(keyframes, cssText);
  }
  getNormalizedKeyframesConfig(viewName) {
    if (!this.normalizedKeyframesCache_[viewName]) {
      this.normalizedKeyframesCache_[viewName] = normalizeAnimationKeyframes(this.cssRules, getStyleBuilder(viewName));
    }
    return this.normalizedKeyframesCache_[viewName];
  }
}
//# sourceMappingURL=CSSKeyframesRuleImpl.js.map