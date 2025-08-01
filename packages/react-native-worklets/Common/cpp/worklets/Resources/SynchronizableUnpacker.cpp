// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char SynchronizableUnpackerCode[] =
    R"DELIMITER__(function __synchronizableUnpacker(synchronizableRef) {
  var proxy = globalThis.__workletsModuleProxy;
  var serializer = !globalThis._WORKLET || globalThis._WORKLETS_BUNDLE_MODE ? function (value, _) {
    return (0, _shareables.makeShareableCloneRecursive)(value);
  } : globalThis._makeShareableClone;
  synchronizableRef.__synchronizableRef = true;
  synchronizableRef.getDirty = function () {
    return proxy.synchronizableGetDirty(synchronizableRef);
  };
  synchronizableRef.getBlocking = function () {
    return proxy.synchronizableGetBlocking(synchronizableRef);
  };
  synchronizableRef.setDirty = function (valueOrFunction) {
    var newValue;
    if (typeof valueOrFunction === 'function') {
      var func = valueOrFunction;
      var prev = synchronizableRef.getDirty();
      newValue = func(prev);
    } else {
      newValue = valueOrFunction;
    }
    proxy.synchronizableSetDirty(synchronizableRef, serializer(newValue, undefined));
  };
  synchronizableRef.setBlocking = function (valueOrFunction) {
    var newValue;
    if (typeof valueOrFunction === 'function') {
      var func = valueOrFunction;
      synchronizableRef.lock();
      var prev = synchronizableRef.getBlocking();
      newValue = func(prev);
      proxy.synchronizableSetBlocking(synchronizableRef, serializer(newValue, undefined));
      synchronizableRef.unlock();
    } else {
      var value = valueOrFunction;
      newValue = value;
      proxy.synchronizableSetBlocking(synchronizableRef, serializer(newValue, undefined));
    }
  };
  synchronizableRef.lock = function () {
    proxy.synchronizableLock(synchronizableRef);
  };
  synchronizableRef.unlock = function () {
    proxy.synchronizableUnlock(synchronizableRef);
  };
  return synchronizableRef;
})DELIMITER__";
} // namespace worklets
