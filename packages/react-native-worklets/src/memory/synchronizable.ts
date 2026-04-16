'use strict';

import type { Synchronizable } from './types';

export function createSynchronizable<TValue = unknown>(
  _value: TValue
): Synchronizable<TValue> {
  throw new Error('[Worklets] `createSynchronizable` is not supported on web.');
}
