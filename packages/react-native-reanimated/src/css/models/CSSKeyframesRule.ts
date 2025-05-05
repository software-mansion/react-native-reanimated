'use strict';
import type { NormalizedCSSAnimationKeyframesConfig } from '../platform/native';
import { normalizeAnimationKeyframes } from '../platform/native';
import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';

export default class CSSKeyframesRuleImpl<
  S extends PlainStyle = PlainStyle,
> extends CSSKeyframesRuleBase<S> {
  private normalizedKeyframes_: NormalizedCSSAnimationKeyframesConfig;

  constructor(keyframes: CSSAnimationKeyframes<S>, cssText?: string) {
    super(keyframes, cssText);
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
  }

  get normalizedKeyframesConfig(): NormalizedCSSAnimationKeyframesConfig {
    return this.normalizedKeyframes_;
  }
}
