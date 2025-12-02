'use strict';

import type { AnyRecord, Maybe, NonMutable } from './helpers';

export enum ValueProcessorTarget {
  CSS = 'css',
  Native = 'native',
}

export type ValueProcessorContext = {
  target: ValueProcessorTarget;
};

export type ValueProcessor<V, R = V> = (
  value: NonMutable<V>
) => Maybe<R> | Record<string, R>;

export type ConfigPropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};
