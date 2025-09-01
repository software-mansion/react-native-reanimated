'use strict';
import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes, PlainStyle } from '../../types';
import { normalizeAnimationKeyframes } from '../normalization';
import { getStyleBuilder } from '../registry';
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
    viewName: string
  ): NormalizedCSSAnimationKeyframesConfig {
    if (!this.normalizedKeyframesCache_[viewName]) {
      this.normalizedKeyframesCache_[viewName] = normalizeAnimationKeyframes(
        this.cssRules,
        getStyleBuilder(viewName)
      );
    }

    return this.normalizedKeyframesCache_[viewName];
  }
}
