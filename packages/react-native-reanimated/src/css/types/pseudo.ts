'use strict';
import type { PlainStyle } from '../../common';
import type { CSSAnimationProperties } from './animation';
import type { CSSTransitionProperties } from './transition';

export type PseudoSelectorKey =
  | ':hover'
  | ':active'
  | ':active-deepest'
  | ':focus'
  | ':focus-within';

export type PseudoValue<T> = {
  default?: T;
} & { [K in PseudoSelectorKey]?: T } & { [K in `:${string}`]?: T };

export type CSSPseudoSelectorStyle = {
  [K in keyof PlainStyle]?: PlainStyle[K] | PseudoValue<PlainStyle[K]>;
} & Partial<CSSAnimationProperties<PlainStyle>> &
  Partial<CSSTransitionProperties<PlainStyle>>;
