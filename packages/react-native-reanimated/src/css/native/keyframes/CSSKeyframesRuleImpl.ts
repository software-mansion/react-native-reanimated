'use strict';
import type { DefaultStyle } from '../../../hook/commonTypes';
import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes } from '../../types';
import { normalizeAnimationKeyframes } from '../normalization';
import type { NormalizedCSSAnimationKeyframesConfig } from '../types';

export default class CSSKeyframesRuleImpl<
  S extends object = DefaultStyle,
> extends CSSKeyframesRuleBase<S> {
  private readonly normalizedKeyframesCache_: Record<
    string,
    NormalizedCSSAnimationKeyframesConfig
  > = {};

  constructor(keyframes: CSSAnimationKeyframes<S>, cssText?: string) {
    super(keyframes, cssText);
  }

  getNormalizedKeyframesConfig(
    compoundComponentName: string
  ): NormalizedCSSAnimationKeyframesConfig {
    this.normalizedKeyframesCache_[compoundComponentName] ??=
      normalizeAnimationKeyframes(this.cssRules, compoundComponentName);
    return this.normalizedKeyframesCache_[compoundComponentName];
  }
}
