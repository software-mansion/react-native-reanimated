'use strict';

import { makeShareableCloneRecursive } from './shareables';
import type { Synchronizable, SynchronizableRef } from './workletTypes';

export function __synchronizableUnpacker<TValue>(
  synchronizableRef: SynchronizableRef<TValue>
): Synchronizable<TValue> {
  const proxy = globalThis.__workletsModuleProxy!;
  const serializer =
    !globalThis._WORKLET || globalThis._WORKLETS_BUNDLE_MODE
      ? (value: TValue, _: unknown) => makeShareableCloneRecursive(value)
      : globalThis._makeShareableClone;
  synchronizableRef.__synchronizableRef = true;
  synchronizableRef.getDirty = () => {
    return proxy.synchronizableGetDirty(synchronizableRef);
  };
  synchronizableRef.getBlocking = () => {
    return proxy.synchronizableGetBlocking(synchronizableRef);
  };
  synchronizableRef.setDirty = (
    valueOrFunction: TValue | ((prev: TValue) => TValue)
  ) => {
    let newValue: TValue;
    if (typeof valueOrFunction === 'function') {
      const func = valueOrFunction as (prev: TValue) => TValue;
      const prev = synchronizableRef.getDirty!();
      newValue = func(prev);
    } else {
      newValue = valueOrFunction;
    }
    proxy.synchronizableSetDirty(
      synchronizableRef,
      serializer(newValue, undefined)
    );
  };
  synchronizableRef.setBlocking = (
    valueOrFunction: TValue | ((prev: TValue) => TValue)
  ) => {
    let newValue: TValue;
    if (typeof valueOrFunction === 'function') {
      const func = valueOrFunction as (prev: TValue) => TValue;
      synchronizableRef.lock!();
      const prev = synchronizableRef.getBlocking!();
      newValue = func(prev);

      proxy.synchronizableSetBlocking(
        synchronizableRef,
        serializer(newValue, undefined)
      );

      synchronizableRef.unlock!();
    } else {
      const value = valueOrFunction;
      newValue = value;
      proxy.synchronizableSetBlocking(
        synchronizableRef,
        serializer(newValue, undefined)
      );
    }
  };
  synchronizableRef.lock = () => {
    proxy.synchronizableLock(synchronizableRef);
  };
  synchronizableRef.unlock = () => {
    proxy.synchronizableUnlock(synchronizableRef);
  };

  return synchronizableRef as unknown as Synchronizable<TValue>;
}

globalThis.__synchronizableUnpacker = __synchronizableUnpacker;

export type SynchronizableUnpacker = typeof __synchronizableUnpacker;
