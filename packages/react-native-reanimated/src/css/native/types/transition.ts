'use strict';
import type { NormalizedCSSTimingFunction } from '../../easing';

export type NormalizedSingleCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
  allowDiscrete: boolean;
};

export type NormalizedCSSTransitionConfig = {
  properties: 'all' | string[];
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
};

type CSSTransitionPropertyUpdates = Record<string, [unknown, unknown] | null>;

export type NormalizedNewCSSTransitionConfig = {
  properties: CSSTransitionPropertyUpdates;
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
};

export type CSSTransitionUpdates = {
  properties?: CSSTransitionPropertyUpdates;
  settings?: Record<string, Partial<NormalizedSingleCSSTransitionSettings>>;
};
