import type { PlainStyle, TimeUnit } from './common';
import type { CSSTimingFunction } from '../easings';
import type { AddArrayPropertyTypes } from './helpers';

export type CSSTransitionProperty<S extends object = PlainStyle> =
  | 'all'
  | 'none'
  | keyof S
  | ('all' | keyof S)[];
export type CSSTransitionDuration = TimeUnit;
export type CSSTransitionTimingFunction = CSSTimingFunction;
export type CSSTransitionDelay = TimeUnit;
export type CSSTransitionBehavior = 'normal' | 'allowDiscrete';

type SingleCSSTransitionSettings = {
  transitionDuration?: CSSTransitionDuration;
  transitionTimingFunction?: CSSTransitionTimingFunction;
  transitionDelay?: CSSTransitionDelay;
};

export type SingleCSSTransitionConfig<S extends object = PlainStyle> =
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

export type CSSTransitionProp = keyof CSSTransitionProperties;
