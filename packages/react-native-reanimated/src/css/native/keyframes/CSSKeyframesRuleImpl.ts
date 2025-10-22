'use strict';
import type { PlainStyle, StyleBuilder } from '../../../common';
import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes } from '../../types';
import { normalizeAnimationKeyframes } from '../normalization';
import { getStyleBuilder, isBaseStyleBuilder } from '../registry';
import type { NormalizedCSSAnimationKeyframesConfig } from '../types';

const BASE_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES = new Set([
  'boxShadow',
  'shadowOffset',
  'textShadowOffset',
  'transformOrigin',
]);

const getSeparatelyInterpolatedNestedProperties = (
  styleBuilder: StyleBuilder
): Set<string> =>
  isBaseStyleBuilder(styleBuilder)
    ? BASE_SEPARATELY_INTERPOLATED_NESTED_PROPERTIES
    : new Set<string>();

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
      const styleBuilder = getStyleBuilder(viewName);
      const separatelyInterpolatedNestedProperties =
        getSeparatelyInterpolatedNestedProperties(styleBuilder);

      this.normalizedKeyframesCache_[viewName] = normalizeAnimationKeyframes(
        this.cssRules,
        styleBuilder,
        separatelyInterpolatedNestedProperties
      );
    }

    return this.normalizedKeyframesCache_[viewName];
  }
}
