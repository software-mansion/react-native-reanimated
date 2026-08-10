'use strict';
import type { DefaultStyle } from '../../hook/commonTypes';
import type { CSSTimingFunction } from '../easing';
import type { TimeUnit } from './common';
import type { AddArrayPropertyTypes } from './helpers';

export type CSSTransitionProperty<S extends object = DefaultStyle> =
  | 'all'
  | 'none'
  | keyof S
  | ('all' | keyof S)[];
export type CSSTransitionDuration = TimeUnit;
export type CSSTransitionTimingFunction = CSSTimingFunction;
export type CSSTransitionDelay = TimeUnit;
export type CSSTransitionBehavior = 'normal' | 'allow-discrete';
export type CSSTransitionShorthand = string;

/**
 * Payload for a CSS transition callback, dispatched once per transitioning
 * property.
 */
export type CSSTransitionEvent = {
  // TODO: add a JS-side view ref (e.g. `target`) once the right ref type is
  // decided.
  /** The transitioning property, camelCased (e.g. `opacity`). */
  propertyName: string;
  /**
   * The amount of time the transition had been running, in seconds, when the
   * event fired.
   */
  elapsedTime: number;
};

export type CSSTransitionCallback = (event: CSSTransitionEvent) => void;

export type CSSTransitionCallbacks = {
  /** Fired when the transition is triggered, before any `transitionDelay`. */
  onTransitionRun?: CSSTransitionCallback;
  /** Fired after `transitionDelay`, when the property starts animating. */
  onTransitionStart?: CSSTransitionCallback;
  /** Fired when the transition completes. */
  onTransitionEnd?: CSSTransitionCallback;
  /** Fired when the transition is interrupted before completing. */
  onTransitionCancel?: CSSTransitionCallback;
};

export type CSSTransitionCallbackProp = keyof CSSTransitionCallbacks;

type SingleCSSTransitionSettings = {
  transitionDuration?: CSSTransitionDuration;
  transitionTimingFunction?: CSSTransitionTimingFunction;
  transitionDelay?: CSSTransitionDelay;
  transitionBehavior?: CSSTransitionBehavior;
};

export type SingleCSSTransitionConfig<S extends object = DefaultStyle> =
  SingleCSSTransitionSettings & {
    transitionProperty?: CSSTransitionProperty<S>;
  };

export type CSSTransitionSettings =
  AddArrayPropertyTypes<SingleCSSTransitionSettings>;

export type CSSTransitionProperties<S extends object = DefaultStyle> =
  CSSTransitionSettings & {
    transitionProperty?: CSSTransitionProperty<S>;
    transition?: CSSTransitionShorthand;
  };

export type CSSTransitionProp = keyof CSSTransitionProperties;
