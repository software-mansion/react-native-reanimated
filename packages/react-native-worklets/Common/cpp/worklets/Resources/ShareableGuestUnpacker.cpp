// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char ShareableGuestUnpackerCode[] =
    R"DELIMITER__((function () {
  var runOnRuntimeSyncFromId;
  var scheduleOnRuntimeFromId;
  var runOnUIAsync;
  var memoize;
  var serializer = globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED ? createSerializable : function (value) {
    return globalThis.__serializer(value);
  };
  if (globalThis.__RUNTIME_KIND === 1) {
    runOnRuntimeSyncFromId = RNRuntimeRunOnRuntimeSyncFromId;
    scheduleOnRuntimeFromId = RNRuntimeScheduleOnRuntimeFromId;
    runOnUIAsync = RNRuntimeRunOnUIAsync;
    memoize = function memoize(unpacked, serialized) {
      serializableMappingCache.set(unpacked, serialized);
    };
  } else {
    var proxy = globalThis.__workletsModuleProxy;
    runOnRuntimeSyncFromId = function runOnRuntimeSyncFromId(hostId, worklet) {
      const _worklet_1296144845132_init_data = {
        code: "function shareableGuestUnpackerNativeTs1(){const{worklet,args}=this.__closure;return globalThis.__makeSerializableCloneOnUIRecursive(worklet(...args));}",
        location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts",
        sourceMap: "{\"version\":3,\"names\":[\"shareableGuestUnpackerNativeTs1\",\"worklet\",\"args\",\"__closure\",\"globalThis\",\"__makeSerializableCloneOnUIRecursive\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts\"],\"mappings\":\"AA+C2C,SAAAA,+BAAMA,CAAA,QAAAC,OAAA,CAAAC,IAAA,OAAAC,SAAA,CAEzC,MAAO,CAAAC,UAAU,CAACC,oCAAoC,CACpDJ,OAAO,CAAC,GAAGC,IAAI,CACjB,CAAC,CACH\",\"ignoreList\":[]}"
      };
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }
      var serializedWorklet = serializer(function shareableGuestUnpackerNativeTs1Factory(_ref) {
        var _worklet_1296144845132_init_data = _ref._worklet_1296144845132_init_data,
          worklet = _ref.worklet,
          args = _ref.args;
        var _e = [new global.Error(), -3, -27];
        var shareableGuestUnpackerNativeTs1 = function shareableGuestUnpackerNativeTs1() {
          return globalThis.__makeSerializableCloneOnUIRecursive(worklet.apply(void 0, _toConsumableArray(args)));
        };
        shareableGuestUnpackerNativeTs1.__closure = {
          worklet: worklet,
          args: args
        };
        shareableGuestUnpackerNativeTs1.__workletHash = 1296144845132;
        shareableGuestUnpackerNativeTs1.__pluginVersion = "0.8.0-main";
        shareableGuestUnpackerNativeTs1.__initData = _worklet_1296144845132_init_data;
        shareableGuestUnpackerNativeTs1.__stackDetails = _e;
        return shareableGuestUnpackerNativeTs1;
      }({
        _worklet_1296144845132_init_data: _worklet_1296144845132_init_data,
        worklet: worklet,
        args: args
      }));
      return proxy.runOnRuntimeSyncFromId(hostId, serializedWorklet);
    };
    scheduleOnRuntimeFromId = function scheduleOnRuntimeFromId(hostId, worklet) {
      const _worklet_15899435822716_init_data = {
        code: "function shareableGuestUnpackerNativeTs2(){const{worklet,args}=this.__closure;return globalThis.__serializer(worklet(...args));}",
        location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts",
        sourceMap: "{\"version\":3,\"names\":[\"shareableGuestUnpackerNativeTs2\",\"worklet\",\"args\",\"__closure\",\"globalThis\",\"__serializer\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts\"],\"mappings\":\"AA+DmB,SAAAA,+BAAMA,CAAA,QAAAC,OAAA,CAAAC,IAAA,OAAAC,SAAA,CAEf,MAAO,CAAAC,UAAU,CAACC,YAAY,CAACJ,OAAO,CAAC,GAAGC,IAAI,CAAC,CAAC,CAClD\",\"ignoreList\":[]}"
      };
      for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        args[_key2 - 2] = arguments[_key2];
      }
      proxy.scheduleOnRuntimeFromId(hostId, serializer(function shareableGuestUnpackerNativeTs2Factory(_ref2) {
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
    memoize = function memoize() {};
  }
  function shareableGuestUnpacker(hostId, shareableRef, guestDecorator) {
    const _worklet_2037730408222_init_data = {
      code: "function shareableGuestUnpackerNativeTs5(setter){const{shareableRef}=this.__closure;const currentValue=shareableRef.value;const newValue=setter(currentValue);shareableRef.value=newValue;}",
      location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts",
      sourceMap: "{\"version\":3,\"names\":[\"shareableGuestUnpackerNativeTs5\",\"setter\",\"shareableRef\",\"__closure\",\"currentValue\",\"value\",\"newValue\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts\"],\"mappings\":\"AA2G0B,QAAC,CAAAA,+BAAuCA,CAAAC,MAAA,QAAAC,YAAA,OAAAC,SAAA,CAE5D,KAAM,CAAAC,YAAY,CAAIF,YAAY,CAAqBG,KAAK,CAC5D,KAAM,CAAAC,QAAQ,CAAGL,MAAM,CAACG,YAAY,CAAC,CACpCF,YAAY,CAAqBG,KAAK,CAAGC,QAAQ,CACpD\",\"ignoreList\":[]}"
    };
    const _worklet_1356596310573_init_data = {
      code: "function shareableGuestUnpackerNativeTs4(value){const{shareableRef}=this.__closure;shareableRef.value=value;}",
      location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts",
      sourceMap: "{\"version\":3,\"names\":[\"shareableGuestUnpackerNativeTs4\",\"value\",\"shareableRef\",\"__closure\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts\"],\"mappings\":\"AAsGyB,QAAC,CAAAA,+BAAmBA,CAAAC,KAAA,QAAAC,YAAA,OAAAC,SAAA,CAEtCD,YAAY,CAAqBD,KAAK,CAAGA,KAAK,CACjD\",\"ignoreList\":[]}"
    };
    const _worklet_10735422963101_init_data = {
      code: "function shareableGuestUnpackerNativeTs3(){const{shareableRef}=this.__closure;console.log('Getting shareable value from guest unpacker',shareableRef);return shareableRef.value;}",
      location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts",
      sourceMap: "{\"version\":3,\"names\":[\"shareableGuestUnpackerNativeTs3\",\"shareableRef\",\"__closure\",\"console\",\"log\",\"value\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/src/memory/shareableGuestUnpacker.native.ts\"],\"mappings\":\"AAgGgB,SAAAA,+BAAMA,CAAA,QAAAC,YAAA,OAAAC,SAAA,CAEhBC,OAAO,CAACC,GAAG,CAAC,6CAA6C,CAAEH,YAAY,CAAC,CACxE,MAAQ,CAAAA,YAAY,CAAqBI,KAAK,CAChD\",\"ignoreList\":[]}"
    };
    var get = function shareableGuestUnpackerNativeTs3Factory(_ref3) {
      var _worklet_10735422963101_init_data = _ref3._worklet_10735422963101_init_data,
        shareableRef = _ref3.shareableRef;
      var _e = [new global.Error(), -2, -27];
      var shareableGuestUnpackerNativeTs3 = function shareableGuestUnpackerNativeTs3() {
        console.log('Getting shareable value from guest unpacker', shareableRef);
        return shareableRef.value;
      };
      shareableGuestUnpackerNativeTs3.__closure = {
        shareableRef: shareableRef
      };
      shareableGuestUnpackerNativeTs3.__workletHash = 10735422963101;
      shareableGuestUnpackerNativeTs3.__pluginVersion = "0.8.0-main";
      shareableGuestUnpackerNativeTs3.__initData = _worklet_10735422963101_init_data;
      shareableGuestUnpackerNativeTs3.__stackDetails = _e;
      return shareableGuestUnpackerNativeTs3;
    }({
      _worklet_10735422963101_init_data: _worklet_10735422963101_init_data,
      shareableRef: shareableRef
    });
    var setWithValue = function shareableGuestUnpackerNativeTs4Factory(_ref4) {
      var _worklet_1356596310573_init_data = _ref4._worklet_1356596310573_init_data,
        shareableRef = _ref4.shareableRef;
      var _e = [new global.Error(), -2, -27];
      var shareableGuestUnpackerNativeTs4 = function shareableGuestUnpackerNativeTs4(value) {
        shareableRef.value = value;
      };
      shareableGuestUnpackerNativeTs4.__closure = {
        shareableRef: shareableRef
      };
      shareableGuestUnpackerNativeTs4.__workletHash = 1356596310573;
      shareableGuestUnpackerNativeTs4.__pluginVersion = "0.8.0-main";
      shareableGuestUnpackerNativeTs4.__initData = _worklet_1356596310573_init_data;
      shareableGuestUnpackerNativeTs4.__stackDetails = _e;
      return shareableGuestUnpackerNativeTs4;
    }({
      _worklet_1356596310573_init_data: _worklet_1356596310573_init_data,
      shareableRef: shareableRef
    });
    var setWithSetter = function shareableGuestUnpackerNativeTs5Factory(_ref5) {
      var _worklet_2037730408222_init_data = _ref5._worklet_2037730408222_init_data,
        shareableRef = _ref5.shareableRef;
      var _e = [new global.Error(), -2, -27];
      var shareableGuestUnpackerNativeTs5 = function shareableGuestUnpackerNativeTs5(setter) {
        var currentValue = shareableRef.value;
        var newValue = setter(currentValue);
        shareableRef.value = newValue;
      };
      shareableGuestUnpackerNativeTs5.__closure = {
        shareableRef: shareableRef
      };
      shareableGuestUnpackerNativeTs5.__workletHash = 2037730408222;
      shareableGuestUnpackerNativeTs5.__pluginVersion = "0.8.0-main";
      shareableGuestUnpackerNativeTs5.__initData = _worklet_2037730408222_init_data;
      shareableGuestUnpackerNativeTs5.__stackDetails = _e;
      return shareableGuestUnpackerNativeTs5;
    }({
      _worklet_2037730408222_init_data: _worklet_2037730408222_init_data,
      shareableRef: shareableRef
    });
    shareableRef.getAsync = function () {
      return runOnUIAsync(get);
    };
    shareableRef.getSync = function () {
      return runOnRuntimeSyncFromId(hostId, get);
    };
    shareableRef.setAsync = function (value) {
      if (typeof value === 'function') {
        scheduleOnRuntimeFromId(hostId, setWithSetter, value);
      } else {
        scheduleOnRuntimeFromId(hostId, setWithValue, value);
      }
    };
    shareableRef.setSync = function (value) {
      if (typeof value === 'function') {
        runOnRuntimeSyncFromId(hostId, setWithSetter, value);
      } else {
        runOnRuntimeSyncFromId(hostId, setWithValue, value);
      }
    };
    shareableRef.isHost = false;
    if (guestDecorator) {
      shareableRef = guestDecorator(shareableRef);
    }
    memoize(shareableRef, shareableRef);
    return shareableRef;
  }
  globalThis.__shareableGuestUnpacker = shareableGuestUnpacker;
})();)DELIMITER__";
} // namespace worklets
