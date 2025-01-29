'use strict';
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { AddArrayPropertyType, AddArrayPropertyTypes } from './helpers';
import type { TimeUnit } from './common';
import type { CSSTimingFunction } from '../easings';

// TRANSITIONS

export type CSSTransitionProperty<S extends object = PlainStyle> =
  | 'all'
  | 'none'
  | keyof S
  | ('all' | keyof S)[];
export type CSSTransitionDuration = TimeUnit;
export type CSSTransitionTimingFunction = CSSTimingFunction;
export type CSSTransitionDelay = TimeUnit;
export type CSSTransitionBehavior = 'normal' | 'allow-discrete';

export type SingleCSSTransitionSettings = {
  transitionDuration?: CSSTransitionDuration;
  transitionTimingFunction?: CSSTransitionTimingFunction;
  transitionDelay?: CSSTransitionDelay;
};

export type SingleCSSTransitionConfig<S extends object> =
  SingleCSSTransitionSettings & {
    transitionProperty?: CSSTransitionProperty<S>;
  };

export type CSSTransitionSettings =
  AddArrayPropertyTypes<SingleCSSTransitionSettings> & {
    transitionBehavior?: CSSTransitionBehavior;
  };

export type CSSTransitionProperties<S extends object = PlainStyle> =
  AddArrayPropertyTypes<SingleCSSTransitionSettings> & {
    transitionProperty?: CSSTransitionProperty<S>;
    transitionBehavior?: CSSTransitionBehavior;
  };

export type CSSTransitionProp = keyof CSSTransitionProperties<object>;

// ANIMATIONS

export type CSSAnimationKeyframeSelector = string | number;
export type CSSAnimationKeyframeBlock<S extends object> = S & {
  animationTimingFunction?: CSSAnimationTimingFunction;
};

export type CSSAnimationKeyframes<S extends object = PlainStyle> = Record<
  CSSAnimationKeyframeSelector,
  CSSAnimationKeyframeBlock<S>
>;
export type CSSAnimationDuration = TimeUnit;
export type CSSAnimationTimingFunction = CSSTimingFunction;
export type CSSAnimationDelay = TimeUnit;
export type CSSAnimationIterationCount = 'infinite' | number;
export type CSSAnimationDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';
export type CSSAnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';
export type CSSAnimationPlayState = 'running' | 'paused';

export type SingleCSSAnimationSettings = {
  animationDuration?: CSSAnimationDuration;
  animationTimingFunction?: CSSAnimationTimingFunction;
  animationDelay?: CSSAnimationDelay;
  animationIterationCount?: CSSAnimationIterationCount;
  animationDirection?: CSSAnimationDirection;
  animationFillMode?: CSSAnimationFillMode;
  animationPlayState?: CSSAnimationPlayState;
  // animationTimeline?: // TODO - This is still experimental in browsers and we might not want to support it when CSS animations in reanimated are released
};

export type SingleCSSAnimationProperties<S extends object = PlainStyle> =
  SingleCSSAnimationSettings & {
    animationName: CSSKeyframesRule<S> | CSSAnimationKeyframes<S>;
  };

export type CSSAnimationSettings =
  AddArrayPropertyTypes<SingleCSSAnimationSettings>;

export type CSSAnimationSettingProp = keyof CSSAnimationSettings;

export interface CSSKeyframeRule<S extends object = PlainStyle> {
  readonly keyText: string;
  readonly style: S;
}

export interface CSSKeyframesRule<S extends object = PlainStyle> {
  readonly cssRules: CSSAnimationKeyframes<S>;
  readonly cssText: string;
  readonly length: number;
  readonly name: string;
}

export type CSSRuleList<S extends object> = CSSKeyframeRule<S>[];

export type CSSAnimationProperties<S extends object = PlainStyle> =
  CSSAnimationSettings & {
    animationName:
      | AddArrayPropertyType<CSSKeyframesRule<S> | CSSAnimationKeyframes<S>>
      | 'none';
  };

export type ExistingCSSAnimationProperties<S extends object = PlainStyle> =
  CSSAnimationProperties<S> & {
    animationName: AddArrayPropertyType<
      CSSKeyframesRule<S> | CSSAnimationKeyframes<S>
    >;
  };

// STYLE

// We have to exclude these properties from the style object because they
// can be overridden by other libraries causing conflicts with our types
// (e.g. expo overrides CSS animation and transition properties)
export type ExcludedCSSProps =
  | keyof CSSAnimationProperties<object>
  | keyof CSSTransitionProperties<object>;

type CombinedStyle = ViewStyle & TextStyle & ImageStyle;

export type PlainStyle<S extends object = CombinedStyle> = Omit<
  S,
  ExcludedCSSProps
>;

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

export type CSSStyle<S extends object = PlainStyle> = PlainStyle<S> &
  Partial<CSSAnimationProperties<PlainStyle<S>>> &
  Partial<CSSTransitionProperties<PlainStyle<S>>>;

type CSSStyleProps<P extends object> = {
  [K in keyof PickStyleProps<P>]: P[K] extends StyleProp<infer U>
    ? U extends object
      ? StyleProp<CSSStyle<U>>
      : never
    : StyleProp<P[K]>;
};

type RestProps<P extends object> = {
  [K in keyof Omit<P, keyof PickStyleProps<P>>]: P[K];
};

export type CSSProps<P extends object> = CSSStyleProps<P> & RestProps<P>;
