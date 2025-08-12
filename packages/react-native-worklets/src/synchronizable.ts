'use strict';

import { createSerializable } from './serializable';
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

export type SynchronizableRef<TValue = unknown> = {
  __synchronizableRef: true;
  __nativeStateSynchronizableJSRef: TValue;
};

export type Synchronizable<TValue = unknown> = SerializableRef<TValue> &
  SynchronizableRef<TValue> & {
    __synchronizableRef: true;
    getDirty(): TValue;
    getBlocking(): TValue;
    setBlocking(value: TValue | ((prev: TValue) => TValue)): void;
    lock(): void;
    unlock(): void;
  };
