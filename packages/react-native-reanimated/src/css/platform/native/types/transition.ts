'use strict';
import type { NormalizedCSSTimingFunction } from '../../../easings';

export type NormalizedSingleCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
  allowDiscrete: boolean;
};

export type NormalizedCSSTransitionConfig = {
  properties: string | string[];
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
};

export type NormalizedCSSTransitionConfigUpdates =
  Partial<NormalizedCSSTransitionConfig>;
