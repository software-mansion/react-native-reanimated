'use strict';
import type { NormalizedCSSTimingFunction } from '../../easing';

export type NormalizedSingleCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
  allowDiscrete: boolean;
};

export type CSSTransitionConfig = Record<
  string,
  (NormalizedSingleCSSTransitionSettings & { value: [unknown, unknown] }) | null
>;

export type NormalizedCSSTransitionConfig = {
  properties: string[] | undefined;
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
};
