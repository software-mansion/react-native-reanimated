import type { ViewStyle } from 'react-native';
import type { CSSTimeUnit } from './common';
import type { CSSTimingFunction, NormalizedCSSTimingFunction } from '../easing';

// BEFORE NORMALIZATION

export type CSSTransitionProperty =
  | 'all'
  | 'none'
  | keyof ViewStyle
  | (keyof ViewStyle)[];
export type CSSTransitionDuration = CSSTimeUnit;
export type CSSTransitionTimingFunction = CSSTimingFunction;
export type CSSTransitionDelay = CSSTimeUnit;

export type CSSTransitionSettings = {
  transitionDuration?: CSSTransitionDuration;
  transitionTimingFunction?: CSSTransitionTimingFunction;
  transitionDelay?: CSSTransitionDelay;
  // transitionBehavior?: // TODO not sure if we want to include it as we can already work with discrete values
};

export type CSSTransitionConfig = CSSTransitionSettings & {
  transitionProperty: CSSTransitionProperty;
};

export type TransitionSettingProp = keyof CSSTransitionConfig;

// AFTER NORMALIZATION

export type NormalizedCSSTransitionSettings = {
  transitionDuration: number;
  transitionTimingFunction: NormalizedCSSTimingFunction;
  transitionDelay: number;
};

export type NormalizedCSSTransitionConfig = NormalizedCSSTransitionSettings & {
  transitionProperty: string[];
};
