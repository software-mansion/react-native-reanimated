'use strict';

import type { NonMutable } from './helpers';

export enum ValueProcessorTarget {
  CSS = 'css',
  Default = 'default',
}

export type ValueProcessorContext = {
  target: ValueProcessorTarget;
};

export type ValueProcessor<V = unknown, R = V> = (
  value: NonMutable<V>,
  context?: ValueProcessorContext
) => R | Record<string, R>;

export type ConfigPropertyAlias<P extends object> = {
  as: keyof P;
};
