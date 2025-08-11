'use strict';

import { createSerializable } from './shareables';
import { WorkletsModule } from './WorkletsModule';
import type { SerializableRef } from './workletTypes';

export function createSynchronizable<TValue>(
  initialValue: TValue
): Synchronizable<TValue> {
  const synchronizableRef = WorkletsModule.createSynchronizable(
    createSerializable(initialValue)
  );

  return globalThis.__synchronizableUnpacker(
    synchronizableRef
  ) as unknown as Synchronizable<TValue>;
}

export interface SynchronizableRef<TValue = unknown> {
  __synchronizableRef: true;
  __nativeStateSynchronizableJSRef: TValue;
}

export interface Synchronizable<TValue = unknown>
  extends SerializableRef<TValue>,
    SynchronizableRef<TValue> {
  __synchronizableRef: true;
  getDirty(): TValue;
  getBlocking(): TValue;
  setBlocking(value: TValue | ((prev: TValue) => TValue)): void;
  lock(): void;
  unlock(): void;
}
