'use strict';
import type { NormalizedCSSAnimationKeyframesConfig } from '../platform/native';
import {
  getStyleBuilder,
  normalizeAnimationKeyframes,
} from '../platform/native';
import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';

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
    componentName: string
  ): NormalizedCSSAnimationKeyframesConfig {
    if (!this.normalizedKeyframesCache_[componentName]) {
      this.normalizedKeyframesCache_[componentName] =
        normalizeAnimationKeyframes(
          this.cssRules,
          getStyleBuilder(componentName)
        );
    }

    return this.normalizedKeyframesCache_[componentName];
  }
}
