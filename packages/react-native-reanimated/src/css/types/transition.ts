'use strict';
import type { CSSStyleProps, CSSTimeUnit } from './common';
import type { CSSTimingFunction, NormalizedCSSTimingFunction } from '../easing';

// BEFORE NORMALIZATION

export type CSSTransitionProperty =
  | 'all'
  | 'none'
  | keyof CSSStyleProps
  | (keyof CSSStyleProps)[];
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

export type NormalizedTransitionProperty = string[] | 'all';

export type NormalizedCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
};

export type NormalizedCSSTransitionConfig = NormalizedCSSTransitionSettings & {
  properties: NormalizedTransitionProperty;
};
