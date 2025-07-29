'use strict';

import type { HostSynchronizableRef, Synchronizable } from './workletTypes';

export function __synchronizableUnpacker<TValue>(
  hostSynchronizableRef: HostSynchronizableRef<TValue>
): Synchronizable<TValue> {
  const synchronizableRef = {
    __synchronizableRef: true as const,
    getDirty: hostSynchronizableRef.getDirty.bind(hostSynchronizableRef),
    getBlocking: hostSynchronizableRef.getBlocking.bind(hostSynchronizableRef),
    setDirty(valueOrFunction: TValue | ((prev: TValue) => TValue)) {
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction as (prev: TValue) => TValue;
        hostSynchronizableRef.setDirty(func(hostSynchronizableRef.getDirty()));
      } else {
        const value = valueOrFunction;
        hostSynchronizableRef.setDirty(value);
      }
    },
    setBlocking(valueOrFunction: TValue | ((prev: TValue) => TValue)) {
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction as (prev: TValue) => TValue;
        hostSynchronizableRef.lock();
        hostSynchronizableRef.setBlocking(
          func(hostSynchronizableRef.getBlocking())
        );
        hostSynchronizableRef.unlock();
      } else {
        const value = valueOrFunction;
        hostSynchronizableRef.setBlocking(value);
      }
    },
    lock: hostSynchronizableRef.lock.bind(hostSynchronizableRef),
    unlock: hostSynchronizableRef.unlock.bind(hostSynchronizableRef),
  };

  Object.setPrototypeOf(synchronizableRef, hostSynchronizableRef);

  return synchronizableRef;
}
