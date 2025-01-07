'use strict';
import type { CSSAnimationKeyframes } from './animation';
import type { PlainStyle } from './common';

export type CSSRuleList<S extends PlainStyle> = CSSKeyframeRule<S>[];

export interface CSSKeyframeRule<S extends PlainStyle> {
  readonly keyText: string;
  readonly style: S;
}

export interface CSSKeyframesRule {
  readonly cssRules: CSSAnimationKeyframes;
  readonly cssText: string;
  readonly length: number;
  readonly name: string;
}
