'use strict';
import type {
  CSSKeyframesHostObject,
  NormalizedCSSAnimationKeyframesConfig,
} from '../platform/native';
import {
  normalizeAnimationKeyframes,
  registerCSSKeyframes,
} from '../platform/native';
import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';

export default class CSSKeyframesRuleImpl<
  S extends PlainStyle = PlainStyle,
> extends CSSKeyframesRuleBase<S> {
  private normalizedKeyframes_: NormalizedCSSAnimationKeyframesConfig;
  private hostObject_: CSSKeyframesHostObject;

  constructor(keyframes: CSSAnimationKeyframes<S>) {
    super(keyframes);
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
    this.hostObject_ = registerCSSKeyframes(
      this.name,
      this.normalizedKeyframes_
    );
    console.log('hostObject_', this.hostObject_.animationName);
  }

  get normalizedKeyframesConfig(): NormalizedCSSAnimationKeyframesConfig {
    return this.normalizedKeyframes_;
  }
}
