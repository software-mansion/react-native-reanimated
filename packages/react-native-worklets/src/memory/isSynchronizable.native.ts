'use strict';

import type { Synchronizable } from './types';

export function isSynchronizable<TValue>(
  value: unknown
): value is Synchronizable<TValue> {
  'worklet';
  return (
    typeof value === 'object' &&
    value !== null &&
    '__synchronizableRef' in value &&
    value.__synchronizableRef === true
  );
}
