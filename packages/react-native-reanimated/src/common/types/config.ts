'use strict';

import type { AnyRecord, Maybe, NonMutable } from './helpers';

export type ValueProcessor<V, R = V> = (
  value: NonMutable<V>
) => Maybe<R> | Record<string, R>;

export type ConfigPropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};
