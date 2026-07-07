'use strict';
import type { RequireAtLeastOne, Simplify } from '../../common';

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

export type CSSPseudoSelectorKey = Simplify<
  'default' | NativePseudoSelectorKey | WebPseudoSelectorKey
>;

type CSSPseudoValue<T> = RequireAtLeastOne<{
  [K in CSSPseudoSelectorKey]?: T;
}>;

export type StyleWithPseudoValues<TStyle extends object> = {
  [K in keyof TStyle]: TStyle[K] | CSSPseudoValue<TStyle[K]>;
};
