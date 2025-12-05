// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char ShareableUnpackerCode[] =
    R"DELIMITER__((function () {
  var serializer = globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE ? function (value, _) {
    return createSerializable(value);
  } : globalThis._createSerializable;
  var runOnUISync;
  var scheduleOnUI;
  var runOnUIAsync;
  var memoize;
  if (globalThis.__RUNTIME_KIND === 1) {
    runOnUISync = RNRuntimeRunOnUISync;
    scheduleOnUI = RNRuntimeScheduleOnUI;
    runOnUIAsync = RNRuntimeRunOnUIAsync;
    memoize = function memoize(unpacked, serialized) {
      serializableMappingCache.set(unpacked, serialized);
    };
  } else {
    var proxy = globalThis.__workletsModuleProxy;
    runOnUISync = function runOnUISync(worklet) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      return proxy.runOnUISync(serializer(function shareableUnpackerNativeTs1Factory(_ref) {
        var _worklet_10367856098025_init_data = _ref._worklet_10367856098025_init_data,
          worklet = _ref.worklet,
          args = _ref.args;
        var _e = [new global.Error(), -3, -27];
        var shareableUnpackerNativeTs1 = function shareableUnpackerNativeTs1() {
          return worklet.apply(void 0, _toConsumableArray(args));
        };
        shareableUnpackerNativeTs1.__closure = {
          worklet: worklet,
          args: args
        };
        shareableUnpackerNativeTs1.__workletHash = 10367856098025;
        shareableUnpackerNativeTs1.__pluginVersion = "0.8.0-main";
        shareableUnpackerNativeTs1.__initData = _worklet_10367856098025_init_data;
        shareableUnpackerNativeTs1.__stackDetails = _e;
        return shareableUnpackerNativeTs1;
      }({
        _worklet_10367856098025_init_data: _worklet_10367856098025_init_data,
        worklet: worklet,
        args: args
      })));
    };
    scheduleOnUI = function scheduleOnUI(worklet) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      proxy.scheduleOnUI(serializer(function shareableUnpackerNativeTs2Factory(_ref2) {
        var _worklet_16822325880736_init_data = _ref2._worklet_16822325880736_init_data,
          worklet = _ref2.worklet,
          args = _ref2.args;
        var _e = [new global.Error(), -3, -27];
        var shareableUnpackerNativeTs2 = function shareableUnpackerNativeTs2() {
          worklet.apply(void 0, _toConsumableArray(args));
        };
        shareableUnpackerNativeTs2.__closure = {
          worklet: worklet,
          args: args
        };
        shareableUnpackerNativeTs2.__workletHash = 16822325880736;
        shareableUnpackerNativeTs2.__pluginVersion = "0.8.0-main";
        shareableUnpackerNativeTs2.__initData = _worklet_16822325880736_init_data;
        shareableUnpackerNativeTs2.__stackDetails = _e;
        return shareableUnpackerNativeTs2;
      }({
        _worklet_16822325880736_init_data: _worklet_16822325880736_init_data,
        worklet: worklet,
        args: args
      })));
    };
    runOnUIAsync = function runOnUIAsync() {
      throw new WorkletsError('runOnUIAsync is not supported on Worklet Runtimes yet');
    };
    memoize = function memoize() {};
  }
  function shareableUnpacker(shareableRef, isHost, initial, inline) {
    var shareable;
    if (isHost) {
      initial = typeof initial === 'function' ? initial() : initial;
      if (inline) {
        var inlineShareable = initial;
        inlineShareable.isHost = true;
        inlineShareable.__shareableRef = true;
        return inlineShareable;
      } else {
        return {
          isHost: true,
          __shareableRef: true,
          value: initial
        };
      }
    } else {
      var get = function shareableUnpackerNativeTs3Factory(_ref3) {
        var _worklet_13730600479565_init_data = _ref3._worklet_13730600479565_init_data,
          shareableRef = _ref3.shareableRef;
        var _e = [new global.Error(), -2, -27];
        var shareableUnpackerNativeTs3 = function shareableUnpackerNativeTs3() {
          return shareableRef.value;
        };
        shareableUnpackerNativeTs3.__closure = {
          shareableRef: shareableRef
        };
        shareableUnpackerNativeTs3.__workletHash = 13730600479565;
        shareableUnpackerNativeTs3.__pluginVersion = "0.8.0-main";
        shareableUnpackerNativeTs3.__initData = _worklet_13730600479565_init_data;
        shareableUnpackerNativeTs3.__stackDetails = _e;
        return shareableUnpackerNativeTs3;
      }({
        _worklet_13730600479565_init_data: _worklet_13730600479565_init_data,
        shareableRef: shareableRef
      });
      var setWithValue = function shareableUnpackerNativeTs4Factory(_ref4) {
        var _worklet_9086612025725_init_data = _ref4._worklet_9086612025725_init_data,
          shareableRef = _ref4.shareableRef;
        var _e = [new global.Error(), -2, -27];
        var shareableUnpackerNativeTs4 = function shareableUnpackerNativeTs4(value) {
          shareableRef.value = value;
        };
        shareableUnpackerNativeTs4.__closure = {
          shareableRef: shareableRef
        };
        shareableUnpackerNativeTs4.__workletHash = 9086612025725;
        shareableUnpackerNativeTs4.__pluginVersion = "0.8.0-main";
        shareableUnpackerNativeTs4.__initData = _worklet_9086612025725_init_data;
        shareableUnpackerNativeTs4.__stackDetails = _e;
        return shareableUnpackerNativeTs4;
      }({
        _worklet_9086612025725_init_data: _worklet_9086612025725_init_data,
        shareableRef: shareableRef
      });
      var setWithSetter = function shareableUnpackerNativeTs5Factory(_ref5) {
        var _worklet_13165553193070_init_data = _ref5._worklet_13165553193070_init_data,
          shareableRef = _ref5.shareableRef;
        var _e = [new global.Error(), -2, -27];
        var shareableUnpackerNativeTs5 = function shareableUnpackerNativeTs5(setter) {
          var currentValue = shareableRef.value;
          var newValue = setter(currentValue);
          shareableRef.value = newValue;
        };
        shareableUnpackerNativeTs5.__closure = {
          shareableRef: shareableRef
        };
        shareableUnpackerNativeTs5.__workletHash = 13165553193070;
        shareableUnpackerNativeTs5.__pluginVersion = "0.8.0-main";
        shareableUnpackerNativeTs5.__initData = _worklet_13165553193070_init_data;
        shareableUnpackerNativeTs5.__stackDetails = _e;
        return shareableUnpackerNativeTs5;
      }({
        _worklet_13165553193070_init_data: _worklet_13165553193070_init_data,
        shareableRef: shareableRef
      });
      shareable = {
        getAsync: function getAsync() {
          return runOnUIAsync(get);
        },
        getSync: function getSync() {
          return runOnUISync(get);
        },
        setAsync: function setAsync(value) {
          if (typeof value === 'function') {
            scheduleOnUI(setWithSetter, value);
          } else {
            scheduleOnUI(setWithValue, value);
          }
        },
        setSync: function setSync(value) {
          if (typeof value === 'function') {
            runOnUISync(setWithSetter, value);
          } else {
            runOnUISync(setWithValue, value);
          }
        },
        isHost: false,
        __shareableRef: true
      };
    }
    memoize(shareable, shareableRef);
    return shareable;
  }
  globalThis.__shareableUnpacker = shareableUnpacker;
})();)DELIMITER__";
} // namespace worklets
