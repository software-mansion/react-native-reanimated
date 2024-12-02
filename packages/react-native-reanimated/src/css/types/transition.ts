'use strict';
import type { CSSStyleProps, CSSTimeUnit } from './common';
import type { CSSTimingFunction, NormalizedCSSTimingFunction } from '../easing';
import type { AddArrayPropertyTypes } from './helpers';

// BEFORE NORMALIZATION

export type CSSTransitionProperty =
  | 'all'
  | 'none'
  | keyof CSSStyleProps
  | ('all' | keyof CSSStyleProps)[];
export type CSSTransitionDuration = CSSTimeUnit;
export type CSSTransitionTimingFunction = CSSTimingFunction;
export type CSSTransitionDelay = CSSTimeUnit;

export type SingleCSSTransitionSettings = {
  transitionDuration?: CSSTransitionDuration;
  transitionTimingFunction?: CSSTransitionTimingFunction;
  transitionDelay?: CSSTransitionDelay;
  // transitionBehavior?: // TODO not sure if we want to include it as we can already work with discrete values
};

export type SingleCSSTransitionConfig = SingleCSSTransitionSettings & {
  transitionProperty: CSSTransitionProperty;
};

export type TransitionSettingProp = keyof SingleCSSTransitionConfig;

export type CSSTransitionSettings =
  AddArrayPropertyTypes<SingleCSSTransitionSettings>;

export type CSSTransitionProperties =
  AddArrayPropertyTypes<SingleCSSTransitionSettings> & {
    transitionProperty: CSSTransitionProperty;
  };

// AFTER NORMALIZATION

export type NormalizedSingleCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
};

export type NormalizedCSSTransitionPropertyNames =
  | 'all'
  | (keyof CSSStyleProps)[];

export type NormalizedCSSTransitionConfig = {
  properties: NormalizedCSSTransitionPropertyNames;
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
};

export type NormalizedCSSTransitionConfigUpdates =
  Partial<NormalizedCSSTransitionConfig>;
