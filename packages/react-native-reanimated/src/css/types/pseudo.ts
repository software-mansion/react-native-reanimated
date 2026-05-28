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

export type PseudoSelectorKey = NativePseudoSelectorKey | WebPseudoSelectorKey;

export type PseudoValue<T> = { default?: T } & {
  [K in PseudoSelectorKey]?: T;
};

export type CSSPseudoSelectorStyle = Partial<CSSStyle<PlainStyle>>;
