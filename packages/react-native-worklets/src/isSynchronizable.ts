'use strict';
import type { Synchronizable } from './synchronizable';

export function isSynchronizable<TValue>(
  value: unknown
): value is Synchronizable<TValue> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__synchronizableRef' in value &&
    value.__synchronizableRef === true
  );
}
