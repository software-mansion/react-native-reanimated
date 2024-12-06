'use strict';
import type { PlainStyleProps, CSSTimeUnit } from './common';
import type {
  CSSTimingFunction,
  NormalizedCSSTimingFunction,
} from '../easings';
import type { AddArrayPropertyTypes } from './helpers';

// BEFORE NORMALIZATION

export type CSSTransitionProperty<S extends object = PlainStyleProps> =
  | 'all'
  | 'none'
  | keyof S
  | ('all' | keyof S)[];
export type CSSTransitionDuration = CSSTimeUnit;
export type CSSTransitionTimingFunction = CSSTimingFunction;
export type CSSTransitionDelay = CSSTimeUnit;
export type CSSTransitionBehavior = 'normal' | 'allowDiscrete';

export type SingleCSSTransitionSettings = {
  transitionDuration?: CSSTransitionDuration;
  transitionTimingFunction?: CSSTransitionTimingFunction;
  transitionDelay?: CSSTransitionDelay;
};

export type SingleCSSTransitionConfig<S extends object = PlainStyleProps> =
  SingleCSSTransitionSettings & {
    transitionProperty: CSSTransitionProperty<S>;
  };

export type CSSTransitionSettings =
  AddArrayPropertyTypes<SingleCSSTransitionSettings> & {
    transitionBehavior?: CSSTransitionBehavior;
  };

export type CSSTransitionProperties<S extends object = PlainStyleProps> =
  AddArrayPropertyTypes<SingleCSSTransitionSettings> & {
    transitionProperty: CSSTransitionProperty<S>;
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
  | (keyof PlainStyleProps)[];

export type NormalizedCSSTransitionConfig = {
  properties: NormalizedCSSTransitionPropertyNames;
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
  allowDiscrete: boolean;
};

export type NormalizedCSSTransitionConfigUpdates =
  Partial<NormalizedCSSTransitionConfig>;
