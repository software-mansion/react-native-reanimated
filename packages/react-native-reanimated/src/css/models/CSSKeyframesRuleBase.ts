'use strict';
import type {
  CSSAnimationKeyframes,
  CSSKeyframesRule,
  PlainStyle,
} from '../types';

export default abstract class CSSKeyframesRuleBase<S extends PlainStyle>
  implements CSSKeyframesRule
{
  private static currentAnimationID = 0;

  private readonly cssRules_: CSSAnimationKeyframes<S>;
  private readonly cssText_: string;
  private readonly length_: number;
  private readonly tag_: number;

  constructor(keyframes: CSSAnimationKeyframes<S>, cssText?: string) {
    this.cssRules_ = keyframes;
    this.cssText_ = cssText ?? JSON.stringify(keyframes);
    this.length_ = Object.keys(keyframes).length;
    this.tag_ = CSSKeyframesRuleBase.generateNextAnimationTag();
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

  get tag() {
    return this.tag_;
  }

  static generateNextAnimationTag() {
    return CSSKeyframesRuleBase.currentAnimationID++;
  }
}
