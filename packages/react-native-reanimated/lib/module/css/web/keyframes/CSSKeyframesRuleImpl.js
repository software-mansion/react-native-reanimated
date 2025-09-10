'use strict';

import { CSSKeyframesRuleBase } from "../../models/index.js";
import { processKeyframeDefinitions } from "../animationParser.js";
export default class CSSKeyframesRuleImpl extends CSSKeyframesRuleBase {
  constructor(keyframes, processedKeyframes) {
    super(keyframes);
    this.processedKeyframes_ = processedKeyframes ?? processKeyframeDefinitions(keyframes);
  }
  get processedKeyframes() {
    return this.processedKeyframes_;
  }
}
//# sourceMappingURL=CSSKeyframesRuleImpl.js.map