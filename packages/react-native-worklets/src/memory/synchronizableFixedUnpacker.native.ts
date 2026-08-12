'use strict';

import { type FixedSynchronizable, type SynchronizableRef } from './types';

export function installSynchronizableFixedUnpacker() {
  'worklet';
  'no-worklet-closure';
  function synchronizableFixedUnpacker<TValue extends number | boolean>(
    synchronizableRef: SynchronizableRef<TValue>
  ): FixedSynchronizable<TValue> {
    const synchronizable =
      synchronizableRef as unknown as FixedSynchronizable<TValue>;
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
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction as (prev: TValue) => TValue;
        synchronizable.lock();
        const prev = synchronizable.getBlocking();
        proxy.synchronizableSetBlocking(synchronizable, func(prev));
        synchronizable.unlock();
      } else {
        proxy.synchronizableSetBlocking(synchronizable, valueOrFunction);
      }
    };
    synchronizable.lock = () => {
      proxy.synchronizableLock(synchronizable);
    };
    synchronizable.unlock = () => {
      proxy.synchronizableUnlock(synchronizable);
    };
    synchronizable.setDirty = (
      valueOrFunction: TValue | ((prev: TValue) => TValue)
    ) => {
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction as (prev: TValue) => TValue;
        proxy.synchronizableSetDirty(
          synchronizable,
          func(proxy.synchronizableGetDirty(synchronizable))
        );
      } else {
        proxy.synchronizableSetDirty(synchronizable, valueOrFunction);
      }
    };

    return synchronizable;
  }

  globalThis.__synchronizableFixedUnpacker = synchronizableFixedUnpacker;
}

export type SynchronizableFixedUnpacker = <TValue extends number | boolean>(
  synchronizableRef: SynchronizableRef<TValue>
) => FixedSynchronizable<TValue>;
