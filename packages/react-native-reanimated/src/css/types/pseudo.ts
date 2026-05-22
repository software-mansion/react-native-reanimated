'use strict';
import type { PlainStyle } from '../../common';
import type { CSSStyle } from './props';

export type PseudoSelectorKey =
  | ':hover'
  | ':active'
  | ':active-deepest'
  | ':focus'
  | ':focus-within';

export type PseudoValue<T> = {
  default?: T;
} & { [K in PseudoSelectorKey]?: T } & { [K in `:${string}`]?: T };

export type CSSPseudoSelectorStyle = Partial<CSSStyle<PlainStyle>>;
