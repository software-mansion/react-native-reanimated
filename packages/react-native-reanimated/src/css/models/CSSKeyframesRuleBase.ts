'use strict';
import { ANIMATION_NAME_PREFIX } from '../constants';
import type {
  CSSAnimationKeyframes,
  CSSKeyframesRule,
  PlainStyle,
} from '../types';

export default abstract class CSSKeyframesRuleBase<S extends PlainStyle>
  implements CSSKeyframesRule
{
  private static currentAnimationID = 0;

  // TODO - change cssRules prop to match specification
  private readonly cssRules_: CSSAnimationKeyframes<S>;
  private readonly cssText_: string;
  private readonly length_: number;
  private readonly name_: string;

  constructor(keyframes: CSSAnimationKeyframes<S>, cssText?: string) {
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
