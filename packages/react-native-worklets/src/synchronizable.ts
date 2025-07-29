'use strict';

import { __synchronizableUnpacker } from './synchronizableUnpacker';
import { WorkletsModule } from './WorkletsModule';
import type { Synchronizable } from './workletTypes';

export function makeSynchronizable<TValue>(
  initialValue: TValue
): Synchronizable<TValue> {
  const hostSynchronizableRef = WorkletsModule.makeSynchronizable(initialValue);

  return __synchronizableUnpacker(hostSynchronizableRef);
}

export function isSynchronizableRef<TValue>(
  value: unknown
): value is Synchronizable<TValue> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__synchronizableRef' in value &&
    value.__synchronizableRef === true
  );
}
