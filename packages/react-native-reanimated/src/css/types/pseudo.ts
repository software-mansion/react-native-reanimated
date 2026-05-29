'use strict';
import type { PlainStyle } from '../../common';
import type { CSSStyle } from './props';

export type NativePseudoSelectorKey =
  | ':hover'
  | ':active'
  | ':active-deepest'
  | ':focus'
  | ':focus-within';

type WebPseudoSelectorKey =
  | ':focus-visible'
  | ':link'
  | ':visited'
  | ':target'
  | ':any-link'
  | ':disabled'
  | ':enabled'
  | ':checked'
  | ':indeterminate'
  | ':required'
  | ':optional'
  | ':valid'
  | ':invalid'
  | ':in-range'
  | ':out-of-range'
  | ':read-only'
  | ':read-write'
  | ':placeholder-shown'
  | ':autofill'
  | ':default'
  | ':first-child'
  | ':last-child'
  | ':only-child'
  | ':empty'
  | ':first-of-type'
  | ':last-of-type'
  | ':only-of-type'
  | ':root'
  | ':fullscreen';

type DynamicWebPseudoSelectorKey =
  `:${'nth-child' | 'nth-last-child' | 'nth-of-type' | 'nth-last-of-type'}(${string})`;

export type PseudoSelectorKey =
  | NativePseudoSelectorKey
  | WebPseudoSelectorKey
  | DynamicWebPseudoSelectorKey;

type PseudoSelectorStyles<T> = { default?: T } & {
  [K in PseudoSelectorKey]?: T;
};

type ConcretePseudoSelectorKey =
  | 'default'
  | NativePseudoSelectorKey
  | WebPseudoSelectorKey;

type RequireAtLeastOne<T, Keys extends keyof T> = {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[Keys];

export type PseudoValue<T> = RequireAtLeastOne<
  PseudoSelectorStyles<T>,
  ConcretePseudoSelectorKey
>;

export type CSSPseudoSelectorStyle = Partial<CSSStyle<PlainStyle>>;
