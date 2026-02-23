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
    viewName: string,
    componentNameJS?: string
  ): NormalizedCSSAnimationKeyframesConfig {
    if (!this.normalizedKeyframesCache_[viewName]) {
      this.normalizedKeyframesCache_[viewName] = normalizeAnimationKeyframes(
        this.cssRules,
        viewName,
        componentNameJS
      );
    }

    return this.normalizedKeyframesCache_[viewName];
  }
}
