'use strict';

import { normalizeAnimationKeyframes } from "../platform/native/index.js";
import CSSKeyframesRuleBase from "./CSSKeyframesRuleBase.js";
export default class CSSKeyframesRuleImpl extends CSSKeyframesRuleBase {
  constructor(keyframes) {
    super(keyframes);
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
  }
  get normalizedKeyframesConfig() {
    return this.normalizedKeyframes_;
  }
}
//# sourceMappingURL=CSSKeyframesRule.js.map