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
export type CSSTransitionBehavior = 'normal' | 'allowDiscrete';

export type SingleCSSTransitionSettings = {
  transitionDuration?: CSSTransitionDuration;
  transitionTimingFunction?: CSSTransitionTimingFunction;
  transitionDelay?: CSSTransitionDelay;
};

export type SingleCSSTransitionConfig = SingleCSSTransitionSettings & {
  transitionProperty: CSSTransitionProperty;
};

export type CSSTransitionSettings =
  AddArrayPropertyTypes<SingleCSSTransitionSettings> & {
    transitionBehavior?: CSSTransitionBehavior;
  };

export type CSSTransitionProperties =
  AddArrayPropertyTypes<SingleCSSTransitionSettings> & {
    transitionProperty: CSSTransitionProperty;
    transitionBehavior?: CSSTransitionBehavior;
  };

export type TransitionSettingProp = keyof CSSTransitionSettings;

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
  allowDiscrete: boolean;
};

export type NormalizedCSSTransitionConfigUpdates =
  Partial<NormalizedCSSTransitionConfig>;
