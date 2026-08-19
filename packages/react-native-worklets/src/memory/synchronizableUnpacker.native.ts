/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

import { type Synchronizable, type SynchronizableRef } from './types';

export function installSynchronizableUnpacker() {
  'worklet';
  'no-worklet-closure';
  // TODO: Add cache for synchronizables.
  const serializer =
    globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED
      ? require('./serializable').createSerializable
      : (value: unknown) => globalThis.__serializer(value);

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
    const setBlockingValue = (newValue: TValue) => {
      proxy.synchronizableSetBlocking(synchronizable, serializer(newValue));
    };
    synchronizable.setBlocking = (
      valueOrFunction: TValue | ((prev: TValue) => TValue)
    ) => {
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction as (prev: TValue) => TValue;
        synchronizable.lock();
        if (__DEV__) {
          try {
            const prev = synchronizable.getBlocking();
            setBlockingValue(func(prev));
          } finally {
            synchronizable.unlock();
          }
        } else {
          const prev = synchronizable.getBlocking();
          setBlockingValue(func(prev));
          synchronizable.unlock();
        }
      } else {
        setBlockingValue(valueOrFunction);
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
