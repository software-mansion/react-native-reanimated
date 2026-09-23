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

/**
 * Lifecycle callbacks of a **CSS transition**, fired once per transitioning
 * property. `withTiming`, `withSpring` and layout animations never fire them.
 */
export type CSSTransitionCallbacks = {
  /** Fired when the CSS transition is triggered, before any `transitionDelay`. */
  onCSSTransitionRun?: CSSTransitionCallback;
  /** Fired after `transitionDelay`, when the property starts animating. */
  onCSSTransitionStart?: CSSTransitionCallback;
  /** Fired when the CSS transition completes. */
  onCSSTransitionEnd?: CSSTransitionCallback;
  /**
   * Fired when the CSS transition is interrupted before completing, including
   * when the property is retargeted mid-flight.
   */
  onCSSTransitionCancel?: CSSTransitionCallback;
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
