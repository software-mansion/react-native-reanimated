'use strict';
import type { NormalizedCSSTimingFunction } from '../../../easings';
import type { PlainStyle } from '../../../types';

export type NormalizedSingleCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
};

export type NormalizedCSSTransitionPropertyNames = 'all' | (keyof PlainStyle)[];

export type NormalizedCSSTransitionConfig = {
  properties: NormalizedCSSTransitionPropertyNames;
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
  allowDiscrete: boolean;
};

export type NormalizedCSSTransitionConfigUpdates =
  Partial<NormalizedCSSTransitionConfig>;
