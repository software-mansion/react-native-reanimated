'use strict';
import type { StyleProp } from 'react-native';

import type { AnyRecord, PlainStyle } from '../../common';
import type { CSSAnimationProperties } from './animation';
import type { CSSTransitionProperties } from './transition';

/*
  Style type properties (properties that extends StyleProp<ViewStyle>)
  can be defined with other property names than "style". For example `contentContainerStyle` in FlatList.
  Type definition for all style type properties should act similarly, hence we
  pick keys with 'Style' substring with the use of this utility type.
*/
type PickStyleProps<P> = Pick<
  P,
  {
    [K in keyof P]-?: K extends `${string}Style` | 'style' ? K : never;
  }[keyof P]
>;

const PSEUDO_SELECTOR_KEYS = [
  ':hover',
  ':active',
  ':active-deepest',
  ':focus',
  ':focus-within',
] as const;

export type PseudoSelectorKey = (typeof PSEUDO_SELECTOR_KEYS)[number];

export const PSEUDO_STATE_KEYS: ReadonlySet<string> = new Set<string>([
  'default',
  ...PSEUDO_SELECTOR_KEYS,
]);

export type PseudoValue<T> = {
  default?: T;
} & { [K in PseudoSelectorKey]?: T } & { [K in `:${string}`]?: T };

export type CSSStyle<S extends AnyRecord = PlainStyle> = {
  [K in keyof S]: S[K] | PseudoValue<NonNullable<S[K]>>;
} & Partial<CSSAnimationProperties<S>> &
  Partial<CSSTransitionProperties<S>>;

export type CSSPseudoSelectorStyle = {
  [K in keyof PlainStyle]?:
    | PlainStyle[K]
    | PseudoValue<NonNullable<PlainStyle[K]>>;
} & Partial<CSSAnimationProperties<PlainStyle>> &
  Partial<CSSTransitionProperties<PlainStyle>>;

type CSSStyleProps<P extends object> = {
  [K in keyof PickStyleProps<P>]: P[K] extends StyleProp<infer U>
    ? U extends object
      ? StyleProp<CSSStyle<U>>
      : never
    : never;
};

type RestProps<P extends object> = {
  [K in keyof Omit<P, keyof PickStyleProps<P>>]: P[K];
};

export type CSSProps<P extends object> = CSSStyleProps<P> & RestProps<P>;
