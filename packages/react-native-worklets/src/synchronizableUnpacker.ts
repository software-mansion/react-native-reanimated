'use strict';

import { createSerializable } from './serializable';
import type { Synchronizable, SynchronizableRef } from './synchronizable';

export function __installUnpacker() {
  // TODO: Add cache for synchronizables.
  const serializer =
    !globalThis._WORKLET || globalThis._WORKLETS_BUNDLE_MODE
      ? (value: unknown, _: unknown) => createSerializable(value)
      : globalThis._createSerializable;

  function synchronizableUnpacker<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): Synchronizable<TValue> {
    const synchronizable =
      synchronizableRef as unknown as Synchronizable<TValue>;
    const proxy = globalThis.__workletsModuleProxy!;

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

        proxy.synchronizableSetBlocking(
          synchronizable,
          serializer(newValue, undefined)
        );

        synchronizable.unlock();
      } else {
        const value = valueOrFunction;
        newValue = value;
        proxy.synchronizableSetBlocking(
          synchronizable,
          serializer(newValue, undefined)
        );
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
