'use strict';

import { makeShareableCloneRecursive } from './shareables';
import { __synchronizableUnpacker } from './synchronizableUnpacker';
import { WorkletsModule } from './WorkletsModule';
import type { Synchronizable } from './workletTypes';

export function makeSynchronizable<TValue>(
  initialValue: TValue
): Synchronizable<TValue> {
  const synchronizableRef = WorkletsModule.makeSynchronizable(
    makeShareableCloneRecursive(initialValue)
  );

  return __synchronizableUnpacker(
    synchronizableRef
  ) as unknown as Synchronizable<TValue>;
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
