'use strict';
import type { PlainStyle } from './common';

export type CSSRuleList<S extends PlainStyle> = CSSKeyframeRule<S>[];

export interface CSSKeyframeRule<S extends PlainStyle> {
  readonly keyText: string;
  readonly style: S;
}

export interface CSSKeyframesRule {
  readonly length: number;
  readonly cssText: string;
}
