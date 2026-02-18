'use strict';

import { createSerializable } from './serializable';
import { type Synchronizable, type SynchronizableRef } from './types';

export function installSynchronizableUnpacker() {
  'worklet';
  'no-worklet-closure';
  // TODO: Add cache for synchronizables.
  const serializer =
    globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED
      ? createSerializable
      : (value: unknown) => globalThis.__serializer(value);

  function synchronizableUnpacker<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): Synchronizable<TValue> {
    const synchronizable =
      synchronizableRef as unknown as Synchronizable<TValue>;
    const proxy = globalThis.__workletsModuleProxy;

    synchronizable.__synchronizableRef = true;
    synchronizable.getDirty = () => {
      // @ts-ignore wwww
      if (globalThis.__RUNTIME_KIND !== 1 && globalThis.__failAfterLogBox) {
        // eslint-disable-next-line reanimated/use-worklets-error
        throw new Error('test');
      }
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
