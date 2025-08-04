'use strict';

import { makeShareableCloneRecursive } from './shareables';
import { __synchronizableUnpacker } from './synchronizableUnpacker';
import { WorkletsModule } from './WorkletsModule';
import type { ShareableRef } from './workletTypes';

export function createSynchronizable<TValue>(
  initialValue: TValue
): Synchronizable<TValue> {
  const synchronizableRef = WorkletsModule.makeSynchronizable(
    makeShareableCloneRecursive(initialValue)
  );

  return __synchronizableUnpacker(
    synchronizableRef
  ) as unknown as Synchronizable<TValue>;
}

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

export interface SynchronizableRef<TValue = unknown> {
  __synchronizableRef: true;
  __nativeStateSynchronizableJSRef: TValue;
}

export interface Synchronizable<TValue = unknown>
  extends ShareableRef<TValue>,
    SynchronizableRef<TValue> {
  __synchronizableRef: true;
  getDirty(): TValue;
  getBlocking(): TValue;
  setBlocking(value: TValue | ((prev: TValue) => TValue)): void;
  lock(): void;
  unlock(): void;
}
