'use strict';
import type { PlainStyle } from '../../../common';
import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes } from '../../types';
import { normalizeAnimationKeyframes } from '../normalization';
import type { NormalizedCSSAnimationKeyframesConfig } from '../types';

export default class CSSKeyframesRuleImpl<
  S extends PlainStyle = PlainStyle,
> extends CSSKeyframesRuleBase<S> {
  private readonly normalizedKeyframesCache_: Record<
    string,
    NormalizedCSSAnimationKeyframesConfig
  > = {};

  constructor(keyframes: CSSAnimationKeyframes<S>, cssText?: string) {
    super(keyframes, cssText);
  }

  getNormalizedKeyframesConfig(
    reactViewName: string
  ): NormalizedCSSAnimationKeyframesConfig {
    if (!this.normalizedKeyframesCache_[reactViewName]) {
      this.normalizedKeyframesCache_[reactViewName] =
        normalizeAnimationKeyframes(this.cssRules, reactViewName);
    }

    return this.normalizedKeyframesCache_[reactViewName];
  }
}
