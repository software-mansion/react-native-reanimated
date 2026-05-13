'use strict';

import { runOnRuntimeSyncWithId as BundleRunOnRuntimeSyncFromId, scheduleOnRuntimeWithId as BundleScheduleOnRuntimeFromId } from '../runtimes';
import { runOnUIAsync as BundleRuntimeRunOnUIAsync } from '../threads';
import { createSerializable } from './serializable';
import { serializableMappingCache } from './serializableMappingCache';
const _worklet_1836199037380_init_data = {
  code: "function installShareableGuestUnpacker_fileTs6(){let runOnRuntimeSyncFromId;let memoize;let scheduleOnRuntimeFromId;let runOnUIAsync;let serializer;if(globalThis.__RUNTIME_KIND===1||globalThis._WORKLETS_BUNDLE_MODE_ENABLED){serializer=createSerializable;memoize=serializableMappingCache.set.bind(serializableMappingCache);runOnRuntimeSyncFromId=BundleRunOnRuntimeSyncFromId;scheduleOnRuntimeFromId=BundleScheduleOnRuntimeFromId;runOnUIAsync=BundleRuntimeRunOnUIAsync;}else{serializer=function(value){return globalThis.__serializer(value);};memoize=function(){};const proxy=globalThis.__workletsModuleProxy;runOnRuntimeSyncFromId=function(hostId,worklet,...args){const _worklet_4825243480154_init_data={code:\"function fileTs1(){const{worklet,args}=this.__closure;return globalThis.__serializer(worklet(...args));}\",location:\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\",sourceMap:\"{\\\"version\\\":3,\\\"names\\\":[\\\"fileTs1\\\",\\\"worklet\\\",\\\"args\\\",\\\"__closure\\\",\\\"globalThis\\\",\\\"__serializer\\\"],\\\"sources\\\":[\\\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\\\"],\\\"mappings\\\":\\\"AAuD2C,SAAAA,OAAMA,CAAA,QAAAC,OAAA,CAAAC,IAAA,OAAAC,SAAA,CAGzC,MAAO,CAAAC,UAAU,CAACC,YAAY,CAACJ,OAAO,CAAC,GAAGC,IAAI,CAAC,CAAC,CAClD\\\",\\\"ignoreList\\\":[]}\"};const serializedWorklet=serializer(function fileTs1Factory({_worklet_4825243480154_init_data:_worklet_4825243480154_init_data,worklet:worklet,args:args}){const _e=[new global.Error(),-3,-27];const fileTs1=function(){return globalThis.__serializer(worklet(...args));};fileTs1.__closure={worklet:worklet,args:args};fileTs1.__workletHash=4825243480154;fileTs1.__pluginVersion=\"0.9.0-main\";fileTs1.__initData=_worklet_4825243480154_init_data;fileTs1.__stackDetails=_e;return fileTs1;}({_worklet_4825243480154_init_data:_worklet_4825243480154_init_data,worklet:worklet,args:args}));return proxy.runOnRuntimeSyncWithId(hostId,serializedWorklet);};scheduleOnRuntimeFromId=function(hostId,worklet,...args){const _worklet_10712630293881_init_data={code:\"function fileTs2(){const{worklet,args}=this.__closure;return globalThis.__serializer(worklet(...args));}\",location:\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\",sourceMap:\"{\\\"version\\\":3,\\\"names\\\":[\\\"fileTs2\\\",\\\"worklet\\\",\\\"args\\\",\\\"__closure\\\",\\\"globalThis\\\",\\\"__serializer\\\"],\\\"sources\\\":[\\\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\\\"],\\\"mappings\\\":\\\"AAsEmB,SAAAA,OAAMA,CAAA,QAAAC,OAAA,CAAAC,IAAA,OAAAC,SAAA,CAGf,MAAO,CAAAC,UAAU,CAACC,YAAY,CAACJ,OAAO,CAAC,GAAGC,IAAI,CAAC,CAAC,CAClD\\\",\\\"ignoreList\\\":[]}\"};proxy.scheduleOnRuntimeWithId(hostId,serializer(function fileTs2Factory({_worklet_10712630293881_init_data:_worklet_10712630293881_init_data,worklet:worklet,args:args}){const _e=[new global.Error(),-3,-27];const fileTs2=function(){return globalThis.__serializer(worklet(...args));};fileTs2.__closure={worklet:worklet,args:args};fileTs2.__workletHash=10712630293881;fileTs2.__pluginVersion=\"0.9.0-main\";fileTs2.__initData=_worklet_10712630293881_init_data;fileTs2.__stackDetails=_e;return fileTs2;}({_worklet_10712630293881_init_data:_worklet_10712630293881_init_data,worklet:worklet,args:args})));};runOnUIAsync=function(){throw new Error('[Worklets] runOnUIAsync is not supported on Worklet Runtimes yet');};}function shareableGuestUnpacker(hostId,shareableRef,guestDecorator){const _worklet_113746681818_init_data={code:\"function fileTs5(setter){const{shareableGuest}=this.__closure;const currentValue=shareableGuest.value;const newValue=setter(currentValue);shareableGuest.value=newValue;}\",location:\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\",sourceMap:\"{\\\"version\\\":3,\\\"names\\\":[\\\"fileTs5\\\",\\\"setter\\\",\\\"shareableGuest\\\",\\\"__closure\\\",\\\"currentValue\\\",\\\"value\\\",\\\"newValue\\\"],\\\"sources\\\":[\\\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\\\"],\\\"mappings\\\":\\\"AA8G0B,QAAC,CAAAA,QAAgCC,MAAK,QAAAC,cAAA,OAAAC,SAAA,CAG1D,KAAM,CAAAC,YAAY,CAAIF,cAAc,CAAUG,KAAK,CACnD,KAAM,CAAAC,QAAQ,CAAGL,MAAM,CAACG,YAAY,CAAC,CACpCF,cAAc,CAAUG,KAAK,CAAGC,QAAQ,CAC3C\\\",\\\"ignoreList\\\":[]}\"};const _worklet_3114830085704_init_data={code:\"function fileTs4(value){const{shareableGuest}=this.__closure;shareableGuest.value=value;}\",location:\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\",sourceMap:\"{\\\"version\\\":3,\\\"names\\\":[\\\"fileTs4\\\",\\\"value\\\",\\\"shareableGuest\\\",\\\"__closure\\\"],\\\"sources\\\":[\\\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\\\"],\\\"mappings\\\":\\\"AAwGyB,QAAC,CAAAA,OAAaA,CAAAC,KAAK,QAAAC,cAAA,OAAAC,SAAA,CAGrCD,cAAc,CAAUD,KAAK,CAAGA,KAAK,CACxC\\\",\\\"ignoreList\\\":[]}\"};const _worklet_2258917941272_init_data={code:\"function fileTs3(){const{shareableGuest}=this.__closure;return shareableGuest.value;}\",location:\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\",sourceMap:\"{\\\"version\\\":3,\\\"names\\\":[\\\"fileTs3\\\",\\\"shareableGuest\\\",\\\"__closure\\\",\\\"value\\\"],\\\"sources\\\":[\\\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\\\"],\\\"mappings\\\":\\\"AAkGgB,SAAAA,OAAMA,CAAA,QAAAC,cAAA,OAAAC,SAAA,CAGhB,MAAQ,CAAAD,cAAc,CAAUE,KAAK,CACvC\\\",\\\"ignoreList\\\":[]}\"};let shareableGuest=shareableRef;shareableGuest.isHost=false;shareableGuest.__shareableRef=true;const get=function fileTs3Factory({_worklet_2258917941272_init_data:_worklet_2258917941272_init_data,shareableGuest:shareableGuest}){const _e=[new global.Error(),-2,-27];const fileTs3=function(){return shareableGuest.value;};fileTs3.__closure={shareableGuest:shareableGuest};fileTs3.__workletHash=2258917941272;fileTs3.__pluginVersion=\"0.9.0-main\";fileTs3.__initData=_worklet_2258917941272_init_data;fileTs3.__stackDetails=_e;return fileTs3;}({_worklet_2258917941272_init_data:_worklet_2258917941272_init_data,shareableGuest:shareableGuest});const setWithValue=function fileTs4Factory({_worklet_3114830085704_init_data:_worklet_3114830085704_init_data,shareableGuest:shareableGuest}){const _e=[new global.Error(),-2,-27];const fileTs4=function(value){shareableGuest.value=value;};fileTs4.__closure={shareableGuest:shareableGuest};fileTs4.__workletHash=3114830085704;fileTs4.__pluginVersion=\"0.9.0-main\";fileTs4.__initData=_worklet_3114830085704_init_data;fileTs4.__stackDetails=_e;return fileTs4;}({_worklet_3114830085704_init_data:_worklet_3114830085704_init_data,shareableGuest:shareableGuest});const setWithSetter=function fileTs5Factory({_worklet_113746681818_init_data:_worklet_113746681818_init_data,shareableGuest:shareableGuest}){const _e=[new global.Error(),-2,-27];const fileTs5=function(setter){const currentValue=shareableGuest.value;const newValue=setter(currentValue);shareableGuest.value=newValue;};fileTs5.__closure={shareableGuest:shareableGuest};fileTs5.__workletHash=113746681818;fileTs5.__pluginVersion=\"0.9.0-main\";fileTs5.__initData=_worklet_113746681818_init_data;fileTs5.__stackDetails=_e;return fileTs5;}({_worklet_113746681818_init_data:_worklet_113746681818_init_data,shareableGuest:shareableGuest});shareableGuest.getAsync=function(){return runOnUIAsync(get);};shareableGuest.getSync=function(){return runOnRuntimeSyncFromId(hostId,get);};shareableGuest.setAsync=function(value){if(typeof value==='function'){scheduleOnRuntimeFromId(hostId,setWithSetter,value);}else{scheduleOnRuntimeFromId(hostId,setWithValue,value);}};shareableGuest.setSync=function(value){if(typeof value==='function'){runOnRuntimeSyncFromId(hostId,setWithSetter,value);}else{runOnRuntimeSyncFromId(hostId,setWithValue,value);}};if(guestDecorator){shareableGuest=guestDecorator(shareableGuest);}memoize(shareableGuest,shareableRef);return shareableGuest;}globalThis.__shareableGuestUnpacker=shareableGuestUnpacker;}",
  location: "/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts",
  sourceMap: "{\"version\":3,\"names\":[\"installShareableGuestUnpacker_fileTs6\",\"runOnRuntimeSyncFromId\",\"memoize\",\"scheduleOnRuntimeFromId\",\"runOnUIAsync\",\"serializer\",\"globalThis\",\"__RUNTIME_KIND\",\"_WORKLETS_BUNDLE_MODE_ENABLED\",\"createSerializable\",\"serializableMappingCache\",\"set\",\"bind\",\"BundleRunOnRuntimeSyncFromId\",\"BundleScheduleOnRuntimeFromId\",\"BundleRuntimeRunOnUIAsync\",\"value\",\"__serializer\",\"proxy\",\"__workletsModuleProxy\",\"hostId\",\"worklet\",\"args\",\"_worklet_4825243480154_init_data\",\"code\",\"location\",\"sourceMap\",\"serializedWorklet\",\"fileTs1Factory\",\"_e\",\"global\",\"Error\",\"fileTs1\",\"__closure\",\"__workletHash\",\"__pluginVersion\",\"__initData\",\"__stackDetails\",\"runOnRuntimeSyncWithId\",\"_worklet_10712630293881_init_data\",\"scheduleOnRuntimeWithId\",\"fileTs2Factory\",\"fileTs2\",\"shareableGuestUnpacker\",\"shareableRef\",\"guestDecorator\",\"_worklet_113746681818_init_data\",\"_worklet_3114830085704_init_data\",\"_worklet_2258917941272_init_data\",\"shareableGuest\",\"isHost\",\"__shareableRef\",\"get\",\"fileTs3Factory\",\"fileTs3\",\"setWithValue\",\"fileTs4Factory\",\"fileTs4\",\"setWithSetter\",\"fileTs5Factory\",\"fileTs5\",\"setter\",\"currentValue\",\"newValue\",\"getAsync\",\"getSync\",\"setAsync\",\"setSync\",\"__shareableGuestUnpacker\"],\"sources\":[\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\"],\"mappings\":\"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\",\"ignoreList\":[]}"
};
export const installShareableGuestUnpacker = function installShareableGuestUnpacker_fileTs6Factory({
  _worklet_1836199037380_init_data
}) {
  const _e = [new global.Error(), 1, -27];
  const installShareableGuestUnpacker = function () {
    let runOnRuntimeSyncFromId;
    let memoize;
    let scheduleOnRuntimeFromId;
    let runOnUIAsync;
    let serializer;
    if (globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      serializer = createSerializable;
      memoize = serializableMappingCache.set.bind(serializableMappingCache);
      runOnRuntimeSyncFromId = BundleRunOnRuntimeSyncFromId;
      scheduleOnRuntimeFromId = BundleScheduleOnRuntimeFromId;
      runOnUIAsync = BundleRuntimeRunOnUIAsync;
    } else {
      // Serializer can't be inlined here because it might be yet undefined
      // when the unpacker is installed.
      serializer = value => globalThis.__serializer(value);
      memoize = () => {
        // No-op on Worklet Runtimes outside of Bundle Mode.
      };
      const proxy = globalThis.__workletsModuleProxy;
      runOnRuntimeSyncFromId = (hostId, worklet, ...args) => {
        const _worklet_4825243480154_init_data = {
          code: "function fileTs1(){const{worklet,args}=this.__closure;return globalThis.__serializer(worklet(...args));}",
          location: "/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts",
          sourceMap: "{\"version\":3,\"names\":[\"fileTs1\",\"worklet\",\"args\",\"__closure\",\"globalThis\",\"__serializer\"],\"sources\":[\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\"],\"mappings\":\"AAuD2C,SAAAA,OAAMA,CAAA,QAAAC,OAAA,CAAAC,IAAA,OAAAC,SAAA,CAGzC,MAAO,CAAAC,UAAU,CAACC,YAAY,CAACJ,OAAO,CAAC,GAAGC,IAAI,CAAC,CAAC,CAClD\",\"ignoreList\":[]}"
        };
        const serializedWorklet = serializer(function fileTs1Factory({
          _worklet_4825243480154_init_data,
          worklet,
          args
        }) {
          const _e = [new global.Error(), -3, -27];
          const fileTs1 = function () {
            return globalThis.__serializer(worklet(...args));
          };
          fileTs1.__closure = {
            worklet,
            args
          };
          fileTs1.__workletHash = 4825243480154;
          fileTs1.__pluginVersion = "0.9.0-main";
          fileTs1.__initData = _worklet_4825243480154_init_data;
          fileTs1.__stackDetails = _e;
          return fileTs1;
        }({
          _worklet_4825243480154_init_data,
          worklet,
          args
        }));
        return proxy.runOnRuntimeSyncWithId(hostId, serializedWorklet);
      };
      scheduleOnRuntimeFromId = (hostId, worklet, ...args) => {
        const _worklet_10712630293881_init_data = {
          code: "function fileTs2(){const{worklet,args}=this.__closure;return globalThis.__serializer(worklet(...args));}",
          location: "/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts",
          sourceMap: "{\"version\":3,\"names\":[\"fileTs2\",\"worklet\",\"args\",\"__closure\",\"globalThis\",\"__serializer\"],\"sources\":[\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\"],\"mappings\":\"AAsEmB,SAAAA,OAAMA,CAAA,QAAAC,OAAA,CAAAC,IAAA,OAAAC,SAAA,CAGf,MAAO,CAAAC,UAAU,CAACC,YAAY,CAACJ,OAAO,CAAC,GAAGC,IAAI,CAAC,CAAC,CAClD\",\"ignoreList\":[]}"
        };
        proxy.scheduleOnRuntimeWithId(hostId, serializer(function fileTs2Factory({
          _worklet_10712630293881_init_data,
          worklet,
          args
        }) {
          const _e = [new global.Error(), -3, -27];
          const fileTs2 = function () {
            return globalThis.__serializer(worklet(...args));
          };
          fileTs2.__closure = {
            worklet,
            args
          };
          fileTs2.__workletHash = 10712630293881;
          fileTs2.__pluginVersion = "0.9.0-main";
          fileTs2.__initData = _worklet_10712630293881_init_data;
          fileTs2.__stackDetails = _e;
          return fileTs2;
        }({
          _worklet_10712630293881_init_data,
          worklet,
          args
        })));
      };
      runOnUIAsync = () => {
        throw new Error('[Worklets] runOnUIAsync is not supported on Worklet Runtimes yet');
      };
    }
    function shareableGuestUnpacker(hostId, shareableRef, guestDecorator) {
      const _worklet_113746681818_init_data = {
        code: "function fileTs5(setter){const{shareableGuest}=this.__closure;const currentValue=shareableGuest.value;const newValue=setter(currentValue);shareableGuest.value=newValue;}",
        location: "/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts",
        sourceMap: "{\"version\":3,\"names\":[\"fileTs5\",\"setter\",\"shareableGuest\",\"__closure\",\"currentValue\",\"value\",\"newValue\"],\"sources\":[\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\"],\"mappings\":\"AA8G0B,QAAC,CAAAA,QAAgCC,MAAK,QAAAC,cAAA,OAAAC,SAAA,CAG1D,KAAM,CAAAC,YAAY,CAAIF,cAAc,CAAUG,KAAK,CACnD,KAAM,CAAAC,QAAQ,CAAGL,MAAM,CAACG,YAAY,CAAC,CACpCF,cAAc,CAAUG,KAAK,CAAGC,QAAQ,CAC3C\",\"ignoreList\":[]}"
      };
      const _worklet_3114830085704_init_data = {
        code: "function fileTs4(value){const{shareableGuest}=this.__closure;shareableGuest.value=value;}",
        location: "/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts",
        sourceMap: "{\"version\":3,\"names\":[\"fileTs4\",\"value\",\"shareableGuest\",\"__closure\"],\"sources\":[\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\"],\"mappings\":\"AAwGyB,QAAC,CAAAA,OAAaA,CAAAC,KAAK,QAAAC,cAAA,OAAAC,SAAA,CAGrCD,cAAc,CAAUD,KAAK,CAAGA,KAAK,CACxC\",\"ignoreList\":[]}"
      };
      const _worklet_2258917941272_init_data = {
        code: "function fileTs3(){const{shareableGuest}=this.__closure;return shareableGuest.value;}",
        location: "/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts",
        sourceMap: "{\"version\":3,\"names\":[\"fileTs3\",\"shareableGuest\",\"__closure\",\"value\"],\"sources\":[\"/Users/bigpoppe/swmansion/react-native-reanimated/packages/react-native-worklets/plugin/file.ts\"],\"mappings\":\"AAkGgB,SAAAA,OAAMA,CAAA,QAAAC,cAAA,OAAAC,SAAA,CAGhB,MAAQ,CAAAD,cAAc,CAAUE,KAAK,CACvC\",\"ignoreList\":[]}"
      };
      let shareableGuest = shareableRef;
      shareableGuest.isHost = false;
      shareableGuest.__shareableRef = true;
      const get = function fileTs3Factory({
        _worklet_2258917941272_init_data,
        shareableGuest
      }) {
        const _e = [new global.Error(), -2, -27];
        const fileTs3 = function () {
          return shareableGuest.value;
        };
        fileTs3.__closure = {
          shareableGuest
        };
        fileTs3.__workletHash = 2258917941272;
        fileTs3.__pluginVersion = "0.9.0-main";
        fileTs3.__initData = _worklet_2258917941272_init_data;
        fileTs3.__stackDetails = _e;
        return fileTs3;
      }({
        _worklet_2258917941272_init_data,
        shareableGuest
      });
      const setWithValue = function fileTs4Factory({
        _worklet_3114830085704_init_data,
        shareableGuest
      }) {
        const _e = [new global.Error(), -2, -27];
        const fileTs4 = function (value) {
          shareableGuest.value = value;
        };
        fileTs4.__closure = {
          shareableGuest
        };
        fileTs4.__workletHash = 3114830085704;
        fileTs4.__pluginVersion = "0.9.0-main";
        fileTs4.__initData = _worklet_3114830085704_init_data;
        fileTs4.__stackDetails = _e;
        return fileTs4;
      }({
        _worklet_3114830085704_init_data,
        shareableGuest
      });
      const setWithSetter = function fileTs5Factory({
        _worklet_113746681818_init_data,
        shareableGuest
      }) {
        const _e = [new global.Error(), -2, -27];
        const fileTs5 = function (setter) {
          const currentValue = shareableGuest.value;
          const newValue = setter(currentValue);
          shareableGuest.value = newValue;
        };
        fileTs5.__closure = {
          shareableGuest
        };
        fileTs5.__workletHash = 113746681818;
        fileTs5.__pluginVersion = "0.9.0-main";
        fileTs5.__initData = _worklet_113746681818_init_data;
        fileTs5.__stackDetails = _e;
        return fileTs5;
      }({
        _worklet_113746681818_init_data,
        shareableGuest
      });
      shareableGuest.getAsync = () => {
        return runOnUIAsync(get);
      };
      shareableGuest.getSync = () => {
        return runOnRuntimeSyncFromId(hostId, get);
      };
      shareableGuest.setAsync = value => {
        if (typeof value === 'function') {
          scheduleOnRuntimeFromId(hostId, setWithSetter, value);
        } else {
          scheduleOnRuntimeFromId(hostId, setWithValue, value);
        }
      };
      shareableGuest.setSync = value => {
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
  };
  installShareableGuestUnpacker.__closure = {};
  installShareableGuestUnpacker.__workletHash = 1836199037380;
  installShareableGuestUnpacker.__pluginVersion = "0.9.0-main";
  installShareableGuestUnpacker.__initData = _worklet_1836199037380_init_data;
  installShareableGuestUnpacker.__stackDetails = _e;
  return installShareableGuestUnpacker;
}({
  _worklet_1836199037380_init_data
});
