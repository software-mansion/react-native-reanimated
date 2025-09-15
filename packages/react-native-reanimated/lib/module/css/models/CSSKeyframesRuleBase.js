'use strict';

import { ANIMATION_NAME_PREFIX } from '../constants';
export default class CSSKeyframesRuleBase {
  static currentAnimationID = 0;

  // TODO - change cssRules prop to match specification

  constructor(keyframes, cssText) {
    this.cssRules_ = keyframes;
    this.cssText_ = cssText ?? JSON.stringify(keyframes);
    this.length_ = Object.keys(keyframes).length;
    this.name_ = CSSKeyframesRuleBase.generateNextKeyframeName();
  }
  get cssRules() {
    return this.cssRules_;
  }
  get cssText() {
    return this.cssText_;
  }
  get length() {
    return this.length_;
  }
  get name() {
    return this.name_;
  }
  static generateNextKeyframeName() {
    return `${ANIMATION_NAME_PREFIX}${CSSKeyframesRuleBase.currentAnimationID++}`;
  }
}
//# sourceMappingURL=CSSKeyframesRuleBase.js.map