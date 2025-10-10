'use strict';

import type { SerializableRef } from '../serializable/types';

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
