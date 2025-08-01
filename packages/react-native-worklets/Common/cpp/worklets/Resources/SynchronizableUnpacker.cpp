// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char SynchronizableUnpackerCode[] =
    R"DELIMITER__(function __synchronizableUnpacker(hostSynchronizableRef) {
  var synchronizableRef = {
    __synchronizableRef: true,
    getDirty: hostSynchronizableRef.getDirty.bind(hostSynchronizableRef),
    getBlocking: hostSynchronizableRef.getBlocking.bind(hostSynchronizableRef),
    setDirty: function setDirty(valueOrFunction) {
      if (typeof valueOrFunction === 'function') {
        var func = valueOrFunction;
        hostSynchronizableRef.setDirty(func(hostSynchronizableRef.getDirty()));
      } else {
        var value = valueOrFunction;
        hostSynchronizableRef.setDirty(value);
      }
    },
    setBlocking: function setBlocking(valueOrFunction) {
      if (typeof valueOrFunction === 'function') {
        var func = valueOrFunction;
        hostSynchronizableRef.lock();
        hostSynchronizableRef.setBlocking(func(hostSynchronizableRef.getBlocking()));
        hostSynchronizableRef.unlock();
      } else {
        var value = valueOrFunction;
        hostSynchronizableRef.setBlocking(value);
      }
    },
    lock: hostSynchronizableRef.lock.bind(hostSynchronizableRef),
    unlock: hostSynchronizableRef.unlock.bind(hostSynchronizableRef)
  };
  Object.setPrototypeOf(synchronizableRef, hostSynchronizableRef);
  return synchronizableRef;
})DELIMITER__";
} // namespace worklets
