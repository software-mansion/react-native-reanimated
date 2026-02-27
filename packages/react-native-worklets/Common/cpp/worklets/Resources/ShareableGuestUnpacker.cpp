// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char ShareableGuestUnpackerCode[] =
    R"DELIMITER__((function () {
  var runOnRuntimeSyncFromId;
  var memoize;
  var scheduleOnRuntimeFromId;
  var runOnUIAsync;
  var serializer;
  if (globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    serializer = createSerializable;
    memoize = serializableMappingCache.set.bind(serializableMappingCache);
    runOnRuntimeSyncFromId = BundleRunOnRuntimeSyncFromId;
    scheduleOnRuntimeFromId = BundleScheduleOnRuntimeFromId;
    runOnUIAsync = BundleRuntimeRunOnUIAsync;
  } else {
    serializer = function serializer(value) {
      return globalThis.__serializer(value);
    };
    memoize = function memoize() {};
    var proxy = globalThis.__workletsModuleProxy;
    runOnRuntimeSyncFromId = function runOnRuntimeSyncFromId(hostId, worklet) {
      const _worklet_15370944365151_init_data = {
        code: "function shareableGuestUnpackerNativeTs1(){const{worklet,args}=this.__closure;return globalThis.__serializer(worklet(...args));}",
        location: "src/memory/shareableGuestUnpacker.native.ts"
      };
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }
      var serializedWorklet = serializer(function shareableGuestUnpackerNativeTs1Factory(_ref) {
        var _worklet_15370944365151_init_data = _ref._worklet_15370944365151_init_data,
          worklet = _ref.worklet,
          args = _ref.args;
        var _e = [new global.Error(), -3, -27];
        var shareableGuestUnpackerNativeTs1 = function shareableGuestUnpackerNativeTs1() {
          return globalThis.__serializer(worklet.apply(void 0, _toConsumableArray(args)));
        };
        shareableGuestUnpackerNativeTs1.__closure = {
          worklet: worklet,
          args: args
        };
        shareableGuestUnpackerNativeTs1.__workletHash = 15370944365151;
        shareableGuestUnpackerNativeTs1.__pluginVersion = "0.8.0-main";
        shareableGuestUnpackerNativeTs1.__initData = _worklet_15370944365151_init_data;
        shareableGuestUnpackerNativeTs1.__stackDetails = _e;
        return shareableGuestUnpackerNativeTs1;
      }({
        _worklet_15370944365151_init_data: _worklet_15370944365151_init_data,
        worklet: worklet,
        args: args
      }));
      return proxy.runOnRuntimeSyncWithId(hostId, serializedWorklet);
    };
    scheduleOnRuntimeFromId = function scheduleOnRuntimeFromId(hostId, worklet) {
      const _worklet_15899435822716_init_data = {
        code: "function shareableGuestUnpackerNativeTs2(){const{worklet,args}=this.__closure;return globalThis.__serializer(worklet(...args));}",
        location: "src/memory/shareableGuestUnpacker.native.ts"
      };
      for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        args[_key2 - 2] = arguments[_key2];
      }
      proxy.scheduleOnRuntimeWithId(hostId, serializer(function shareableGuestUnpackerNativeTs2Factory(_ref2) {
        var _worklet_15899435822716_init_data = _ref2._worklet_15899435822716_init_data,
          worklet = _ref2.worklet,
          args = _ref2.args;
        var _e = [new global.Error(), -3, -27];
        var shareableGuestUnpackerNativeTs2 = function shareableGuestUnpackerNativeTs2() {
          return globalThis.__serializer(worklet.apply(void 0, _toConsumableArray(args)));
        };
        shareableGuestUnpackerNativeTs2.__closure = {
          worklet: worklet,
          args: args
        };
        shareableGuestUnpackerNativeTs2.__workletHash = 15899435822716;
        shareableGuestUnpackerNativeTs2.__pluginVersion = "0.8.0-main";
        shareableGuestUnpackerNativeTs2.__initData = _worklet_15899435822716_init_data;
        shareableGuestUnpackerNativeTs2.__stackDetails = _e;
        return shareableGuestUnpackerNativeTs2;
      }({
        _worklet_15899435822716_init_data: _worklet_15899435822716_init_data,
        worklet: worklet,
        args: args
      })));
    };
    runOnUIAsync = function runOnUIAsync() {
      throw new WorkletsError('runOnUIAsync is not supported on Worklet Runtimes yet');
    };
  }
  function shareableGuestUnpacker(hostId, shareableRef, guestDecorator) {
    const _worklet_12483657757151_init_data = {
      code: "function shareableGuestUnpackerNativeTs5(setter){const{shareableGuest}=this.__closure;const currentValue=shareableGuest.value;const newValue=setter(currentValue);shareableGuest.value=newValue;}",
      location: "src/memory/shareableGuestUnpacker.native.ts"
    };
    const _worklet_894099936717_init_data = {
      code: "function shareableGuestUnpackerNativeTs4(value){const{shareableGuest}=this.__closure;shareableGuest.value=value;}",
      location: "src/memory/shareableGuestUnpacker.native.ts"
    };
    const _worklet_6656248753821_init_data = {
      code: "function shareableGuestUnpackerNativeTs3(){const{shareableGuest}=this.__closure;return shareableGuest.value;}",
      location: "src/memory/shareableGuestUnpacker.native.ts"
    };
    var shareableGuest = shareableRef;
    shareableGuest.isHost = false;
    shareableGuest.__shareableRef = true;
    var get = function shareableGuestUnpackerNativeTs3Factory(_ref3) {
      var _worklet_6656248753821_init_data = _ref3._worklet_6656248753821_init_data,
        shareableGuest = _ref3.shareableGuest;
      var _e = [new global.Error(), -2, -27];
      var shareableGuestUnpackerNativeTs3 = function shareableGuestUnpackerNativeTs3() {
        return shareableGuest.value;
      };
      shareableGuestUnpackerNativeTs3.__closure = {
        shareableGuest: shareableGuest
      };
      shareableGuestUnpackerNativeTs3.__workletHash = 6656248753821;
      shareableGuestUnpackerNativeTs3.__pluginVersion = "0.8.0-main";
      shareableGuestUnpackerNativeTs3.__initData = _worklet_6656248753821_init_data;
      shareableGuestUnpackerNativeTs3.__stackDetails = _e;
      return shareableGuestUnpackerNativeTs3;
    }({
      _worklet_6656248753821_init_data: _worklet_6656248753821_init_data,
      shareableGuest: shareableGuest
    });
    var setWithValue = function shareableGuestUnpackerNativeTs4Factory(_ref4) {
      var _worklet_894099936717_init_data = _ref4._worklet_894099936717_init_data,
        shareableGuest = _ref4.shareableGuest;
      var _e = [new global.Error(), -2, -27];
      var shareableGuestUnpackerNativeTs4 = function shareableGuestUnpackerNativeTs4(value) {
        shareableGuest.value = value;
      };
      shareableGuestUnpackerNativeTs4.__closure = {
        shareableGuest: shareableGuest
      };
      shareableGuestUnpackerNativeTs4.__workletHash = 894099936717;
      shareableGuestUnpackerNativeTs4.__pluginVersion = "0.8.0-main";
      shareableGuestUnpackerNativeTs4.__initData = _worklet_894099936717_init_data;
      shareableGuestUnpackerNativeTs4.__stackDetails = _e;
      return shareableGuestUnpackerNativeTs4;
    }({
      _worklet_894099936717_init_data: _worklet_894099936717_init_data,
      shareableGuest: shareableGuest
    });
    var setWithSetter = function shareableGuestUnpackerNativeTs5Factory(_ref5) {
      var _worklet_12483657757151_init_data = _ref5._worklet_12483657757151_init_data,
        shareableGuest = _ref5.shareableGuest;
      var _e = [new global.Error(), -2, -27];
      var shareableGuestUnpackerNativeTs5 = function shareableGuestUnpackerNativeTs5(setter) {
        var currentValue = shareableGuest.value;
        var newValue = setter(currentValue);
        shareableGuest.value = newValue;
      };
      shareableGuestUnpackerNativeTs5.__closure = {
        shareableGuest: shareableGuest
      };
      shareableGuestUnpackerNativeTs5.__workletHash = 12483657757151;
      shareableGuestUnpackerNativeTs5.__pluginVersion = "0.8.0-main";
      shareableGuestUnpackerNativeTs5.__initData = _worklet_12483657757151_init_data;
      shareableGuestUnpackerNativeTs5.__stackDetails = _e;
      return shareableGuestUnpackerNativeTs5;
    }({
      _worklet_12483657757151_init_data: _worklet_12483657757151_init_data,
      shareableGuest: shareableGuest
    });
    shareableGuest.getAsync = function () {
      return runOnUIAsync(get);
    };
    shareableGuest.getSync = function () {
      return runOnRuntimeSyncFromId(hostId, get);
    };
    shareableGuest.setAsync = function (value) {
      if (typeof value === 'function') {
        scheduleOnRuntimeFromId(hostId, setWithSetter, value);
      } else {
        scheduleOnRuntimeFromId(hostId, setWithValue, value);
      }
    };
    shareableGuest.setSync = function (value) {
      if (typeof value === 'function') {
        runOnRuntimeSyncFromId(hostId, setWithSetter, value);
      } else {
        runOnRuntimeSyncFromId(hostId, setWithValue, value);
      }
    };
    if (guestDecorator) {
      shareableGuest = guestDecorator(shareableGuest);
    }
    memoize(shareableGuest, shareableRef);
    return shareableGuest;
  }
  globalThis.__shareableGuestUnpacker = shareableGuestUnpacker;
})();)DELIMITER__";
} // namespace worklets
