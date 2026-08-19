/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

import { type Synchronizable, type SynchronizableRef } from './types';

export function installSynchronizableUnpacker() {
  'worklet';
  // TODO: Add cache for synchronizables.
  const serializer = require('./serializable').createSerializable;

  function synchronizableUnpacker<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): Synchronizable<TValue> {
    const synchronizable =
      synchronizableRef as unknown as Synchronizable<TValue>;
    const proxy = globalThis.__workletsModuleProxy;

    synchronizable.__synchronizableRef = true;
    synchronizable.getDirty = () => {
      return proxy.synchronizableGetDirty(synchronizable);
    };
    synchronizable.getBlocking = () => {
      return proxy.synchronizableGetBlocking(synchronizable);
    };
    synchronizable.setBlocking = (
      valueOrFunction: TValue | ((prev: TValue) => TValue)
    ) => {
      let newValue: TValue;
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction as (prev: TValue) => TValue;
        synchronizable.lock();
        const prev = synchronizable.getBlocking();
        newValue = func(prev);

        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue));

        synchronizable.unlock();
      } else {
        const value = valueOrFunction;
        newValue = value;
        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue));
      }
    };
    synchronizable.lock = () => {
      proxy.synchronizableLock(synchronizable);
    };
    synchronizable.unlock = () => {
      proxy.synchronizableUnlock(synchronizable);
    };

    return synchronizable;
  }

  globalThis.__synchronizableUnpacker = synchronizableUnpacker;
}

export type SynchronizableUnpacker = <TValue>(
  synchronizableRef: SynchronizableRef<TValue>
) => Synchronizable<TValue>;
