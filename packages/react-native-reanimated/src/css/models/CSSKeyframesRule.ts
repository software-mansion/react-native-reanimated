'use strict';
import type { NormalizedCSSAnimationKeyframes } from '../platform/native';
import { normalizeAnimationKeyframes } from '../platform/native';
import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';

export default class CSSKeyframesRuleImpl<
  S extends PlainStyle = PlainStyle,
> extends CSSKeyframesRuleBase<S> {
  private normalizedKeyframes_: NormalizedCSSAnimationKeyframes;

  constructor(keyframes: CSSAnimationKeyframes<S>) {
    super(keyframes);
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
  }

  get normalizedKeyframes(): NormalizedCSSAnimationKeyframes {
    return this.normalizedKeyframes_;
  }
}
