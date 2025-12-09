'use strict';

import type { AnyRecord, Maybe, NonMutable } from './helpers';

export enum ValueProcessorTarget {
  CSS = 'css',
  Default = 'default',
}

export type ValueProcessorContext = {
  target: ValueProcessorTarget;
};

export type ValueProcessor<V, R = V> = (
  value: NonMutable<V>,
  context?: ValueProcessorContext
) => Maybe<R> | Record<string, R>;

export type ConfigPropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};
