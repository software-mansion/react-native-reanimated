'use strict';
import type { NormalizedCSSTimingFunction } from '../../easing';

export type NormalizedSingleCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
  allowDiscrete: boolean;
};

export type NormalizedCSSTransitionConfig = {
  properties: null | string[];
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
};
