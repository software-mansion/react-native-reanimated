'use strict';
import type { RequireAtLeastOne, Simplify } from '../../common';
import type { DefaultStyle } from '../../hook/commonTypes';
import type { CSSTransitionProperties } from './transition';

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

declare const pseudoGroupBrand: unique symbol;

/**
 * A view whose states other views' group selectors match, like Tailwind's
 * `group`.
 */
export type PseudoGroup = number & { readonly [pseudoGroupBrand]: true };

export type PseudoStyleSelector = {
  selector: NativePseudoSelectorKey;
  /** Matches against the view hosting the group: `.group:active .label` in CSS. */
  group?: PseudoGroup;
  style: DefaultStyle;
};

export type PseudoStylesConfig = {
  /**
   * Each styled property's resting value; one left out rests at what React
   * renders.
   */
  defaultStyle?: DefaultStyle;
  /**
   * Group selectors yield to the view's own; in each set, `:active-deepest`
   * beats `:active`, then `:hover`, `:focus` and `:focus-within`.
   */
  selectors?: readonly PseudoStyleSelector[];
  hostsGroup?: PseudoGroup;
  transition?: CSSTransitionProperties;
};
