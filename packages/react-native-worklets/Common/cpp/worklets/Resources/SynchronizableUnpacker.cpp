// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char SynchronizableUnpackerCode[] =
    R"DELIMITER__((function () {
  var serializer = !globalThis._WORKLET || globalThis._WORKLETS_BUNDLE_MODE ? _serializable.createSerializable : function (value) {
    return globalThis.__serializer(value);
  };
  function synchronizableUnpacker(synchronizableRef) {
    var synchronizable = synchronizableRef;
    var proxy = globalThis.__workletsModuleProxy;
    synchronizable.__synchronizableRef = true;
    synchronizable.getDirty = function () {
      return proxy.synchronizableGetDirty(synchronizable);
    };
    synchronizable.getBlocking = function () {
      return proxy.synchronizableGetBlocking(synchronizable);
    };
    synchronizable.setBlocking = function (valueOrFunction) {
      var newValue;
      if (typeof valueOrFunction === 'function') {
        var func = valueOrFunction;
        synchronizable.lock();
        var prev = synchronizable.getBlocking();
        newValue = func(prev);
        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue));
        synchronizable.unlock();
      } else {
        var value = valueOrFunction;
        newValue = value;
        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue));
      }
    };
    synchronizable.lock = function () {
      proxy.synchronizableLock(synchronizable);
    };
    synchronizable.unlock = function () {
      proxy.synchronizableUnlock(synchronizable);
    };
    return synchronizable;
  }
  globalThis.__synchronizableUnpacker = synchronizableUnpacker;
})();)DELIMITER__";
} // namespace worklets
