'use strict';
import type { StyleProp } from 'react-native';

import type { UnknownRecord } from '../../common';
import type { DefaultStyle } from '../../hook/commonTypes';
import type { CSSAnimationProperties } from './animation';
import type { StyleWithPseudoValues } from './pseudo';
import type {
  CSSTransitionCallbacks,
  CSSTransitionProperties,
} from './transition';

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

type CSSConfigProps<TStyle extends object = UnknownRecord> = Partial<
  CSSAnimationProperties<TStyle> &
    CSSTransitionProperties<TStyle> &
    CSSTransitionCallbacks
>;

// The CSS config keys (animation/transition settings and callbacks) are
// ours, so we `Omit` them from `TStyle` before pseudo-widening and merge
// them back via `CSSConfigProps`. Widening them inline would collapse to
// `never` if a base style augmentation (e.g. Expo's `expo-env.d.ts`)
// redeclares those keys with conflicting types. See
// https://github.com/software-mansion/react-native-reanimated/issues/9328
export type CSSStyle<TStyle = DefaultStyle> = TStyle extends object
  ? StyleWithPseudoValues<Omit<TStyle, keyof CSSConfigProps>> &
      CSSConfigProps<TStyle>
  : never;

type StylePropsWithCSS<P extends object> = {
  [K in keyof PickStyleProps<P>]: P[K] extends StyleProp<infer U>
    ? U extends object
      ? StyleProp<CSSStyle<U>>
      : never
    : never;
};

type RestProps<P extends object> = {
  [K in keyof Omit<P, keyof PickStyleProps<P>>]: P[K];
};

export type PropsWithCSS<P extends object> = StylePropsWithCSS<P> &
  RestProps<P>;
