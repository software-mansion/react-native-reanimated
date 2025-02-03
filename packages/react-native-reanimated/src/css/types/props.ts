'use strict';
import type { StyleProp } from 'react-native';

import type { CSSAnimationProperties } from './animation';
import type { PlainStyle } from './common';
import type { AnyRecord } from './helpers';
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

export type CSSStyle<S extends AnyRecord = PlainStyle> = S &
  Partial<CSSAnimationProperties<S>> &
  Partial<CSSTransitionProperties<S>>;

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
