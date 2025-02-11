'use strict';
import type { NormalizedCSSAnimationKeyframesConfig } from '../platform/native';
import { normalizeAnimationKeyframes } from '../platform/native';
import CSSKeyframesRegistry from '../registry/CSSKeyframesRegistry';
import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';

export default class CSSKeyframesRuleImpl<
  S extends PlainStyle = PlainStyle,
> extends CSSKeyframesRuleBase<S> {
  static readonly keyframesRegistry = new CSSKeyframesRegistry();

  private normalizedKeyframes_: NormalizedCSSAnimationKeyframesConfig;

  constructor(keyframes: CSSAnimationKeyframes<S>) {
    super(keyframes);
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
    CSSKeyframesRuleImpl.keyframesRegistry.registerKeyframes(this);
  }

  get normalizedKeyframesConfig(): NormalizedCSSAnimationKeyframesConfig {
    return this.normalizedKeyframes_;
  }

  registerUsage(viewTag: number) {
    CSSKeyframesRuleImpl.keyframesRegistry.registerUsage(this.name, viewTag);
  }

  unregisterUsage(viewTag: number) {
    CSSKeyframesRuleImpl.keyframesRegistry.unregisterUsage(this.name, viewTag);
  }
}
