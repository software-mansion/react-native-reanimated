'use strict';
import { normalizeAnimationKeyframes } from '../normalization/animation/keyframes';
import type {
  CSSAnimationKeyframes,
  CSSKeyframesRule,
  NormalizedCSSAnimationKeyframes,
  PlainStyle,
} from '../types';

export default class CSSKeyframesRuleImpl<S extends PlainStyle = PlainStyle>
  implements CSSKeyframesRule
{
  private cssText_: string;
  private normalizedKeyframes_: NormalizedCSSAnimationKeyframes;
  private length_: number;
  private keyframes_: CSSAnimationKeyframes<S>;

  constructor(keyframes: CSSAnimationKeyframes<S>) {
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
    this.cssText_ = JSON.stringify(keyframes);
    this.length_ = Object.keys(keyframes).length;
    this.keyframes_ = keyframes;
  }

  get length() {
    return this.length_;
  }

  get cssText() {
    return this.cssText_;
  }

  get keyframes() {
    return this.keyframes_;
  }

  get normalizedKeyframes(): NormalizedCSSAnimationKeyframes {
    return this.normalizedKeyframes_;
  }
}
