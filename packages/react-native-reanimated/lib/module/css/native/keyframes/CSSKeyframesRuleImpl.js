'use strict';

import { CSSKeyframesRuleBase } from "../../models/index.js";
import { normalizeAnimationKeyframes } from "../normalization/index.js";
import { getStyleBuilder } from "../registry.js";
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