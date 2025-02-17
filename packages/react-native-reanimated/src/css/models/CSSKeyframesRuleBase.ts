'use strict';
import type {
  CSSAnimationKeyframes,
  CSSKeyframesRule,
  PlainStyle,
} from '../types';

let currentAnimationID = 0;

export default abstract class CSSKeyframesRuleBase<S extends PlainStyle>
  implements CSSKeyframesRule
{
  private readonly cssRules_: CSSAnimationKeyframes<S>;
  private readonly cssText_: string;
  private readonly name_: string;

  constructor(keyframes: CSSAnimationKeyframes<S>) {
    this.cssRules_ = keyframes;
    this.cssText_ = JSON.stringify(keyframes);
    this.name_ = CSSKeyframesRuleBase.generateNextKeyframeName();
  }

  get cssRules() {
    return this.cssRules_;
  }

  get cssText() {
    return this.cssText_;
  }

  get name() {
    return this.name_;
  }

  static generateNextKeyframeName() {
    return `REA-CSS-${currentAnimationID++}`;
  }
}
