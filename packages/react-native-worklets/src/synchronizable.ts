'use strict';

import { WorkletsModule } from './WorkletsModule';
import type { SynchronizableRef } from './workletTypes';

export function makeSynchronizable<TValue>(
  initialValue: TValue
): SynchronizableRef<TValue> {
  const hostSynchronizableRef = WorkletsModule.makeSynchronizable(initialValue);
  const synchronizableRef = {
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
  };

  return synchronizableRef;
}
