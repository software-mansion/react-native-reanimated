'use strict';

import { createSerializable } from "./serializable.js";
export function __installUnpacker() {
  // TODO: Add cache for synchronizables.
  const serializer = !globalThis._WORKLET || globalThis._WORKLETS_BUNDLE_MODE ? (value, _) => createSerializable(value) : globalThis._createSerializable;
  function synchronizableUnpacker(synchronizableRef) {
    const synchronizable = synchronizableRef;
    const proxy = globalThis.__workletsModuleProxy;
    synchronizable.__synchronizableRef = true;
    synchronizable.getDirty = () => {
      return proxy.synchronizableGetDirty(synchronizable);
    };
    synchronizable.getBlocking = () => {
      return proxy.synchronizableGetBlocking(synchronizable);
    };
    synchronizable.setBlocking = valueOrFunction => {
      let newValue;
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction;
        synchronizable.lock();
        const prev = synchronizable.getBlocking();
        newValue = func(prev);
        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue, undefined));
        synchronizable.unlock();
      } else {
        const value = valueOrFunction;
        newValue = value;
        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue, undefined));
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
//# sourceMappingURL=synchronizableUnpacker.js.map