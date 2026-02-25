'use strict';
import type { PlainStyle } from '../../../common';
import { getCompoundComponentName } from '../../../common';
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
    reactViewName: string,
    jsComponentName: string
  ): NormalizedCSSAnimationKeyframesConfig {
    const cacheKey = getCompoundComponentName(reactViewName, jsComponentName);
    this.normalizedKeyframesCache_[cacheKey] ??= normalizeAnimationKeyframes(
      this.cssRules,
      reactViewName,
      jsComponentName
    );
    return this.normalizedKeyframesCache_[cacheKey];
  }
}
