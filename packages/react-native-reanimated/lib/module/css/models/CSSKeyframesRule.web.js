'use strict';

import { processKeyframeDefinitions } from "../platform/web/index.js";
import CSSKeyframesRuleBase from "./CSSKeyframesRuleBase.js";
export default class CSSKeyframesRuleImpl extends CSSKeyframesRuleBase {
  constructor(keyframes, processedKeyframes) {
    super(keyframes);
    this.processedKeyframes_ = processedKeyframes ?? processKeyframeDefinitions(keyframes);
  }
  get processedKeyframes() {
    return this.processedKeyframes_;
  }
}
//# sourceMappingURL=CSSKeyframesRule.web.js.map