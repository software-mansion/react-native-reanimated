'use strict';

import { RuntimeKind } from "../runtimeKind.js";
import { WorkletsTurboModule } from "../specs/index.js";
import { checkCppVersion } from "../utils/checkCppVersion.js";
import { jsVersion } from "../utils/jsVersion.js";
import { WorkletsError } from "../WorkletsError.js";
export function createNativeWorkletsModule() {
  return new NativeWorklets();
}
class NativeWorklets {
  #workletsModuleProxy;
  #serializableUndefined;
  #serializableNull;
  #serializableTrue;
  #serializableFalse;
  constructor() {
    globalThis._WORKLETS_VERSION_JS = jsVersion;
    if (global.__workletsModuleProxy === undefined && globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
      WorkletsTurboModule?.installTurboModule();
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new WorkletsError(`Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#native-part-of-worklets-doesnt-seem-to-be-initialized for more details.`);
    }
    if (__DEV__) {
      checkCppVersion();
    }
    this.#workletsModuleProxy = global.__workletsModuleProxy;
    this.#serializableNull = this.#workletsModuleProxy.createSerializableNull();
    this.#serializableUndefined = this.#workletsModuleProxy.createSerializableUndefined();
    this.#serializableTrue = this.#workletsModuleProxy.createSerializableBoolean(true);
    this.#serializableFalse = this.#workletsModuleProxy.createSerializableBoolean(false);
  }
  createSerializable(value, shouldPersistRemote, nativeStateSource) {
    return this.#workletsModuleProxy.createSerializable(value, shouldPersistRemote, nativeStateSource);
  }
  createSerializableImport(from, to) {
    return this.#workletsModuleProxy.createSerializableImport(from, to);
  }
  createSerializableString(str) {
    return this.#workletsModuleProxy.createSerializableString(str);
  }
  createSerializableNumber(num) {
    return this.#workletsModuleProxy.createSerializableNumber(num);
  }
  createSerializableBoolean(bool) {
    return bool ? this.#serializableTrue : this.#serializableFalse;
  }
  createSerializableBigInt(bigInt) {
    return this.#workletsModuleProxy.createSerializableBigInt(bigInt);
  }
  createSerializableUndefined() {
    return this.#serializableUndefined;
  }
  createSerializableNull() {
    return this.#serializableNull;
  }
  createSerializableTurboModuleLike(props, proto) {
    return this.#workletsModuleProxy.createSerializableTurboModuleLike(props, proto);
  }
  createSerializableObject(obj, shouldRetainRemote, nativeStateSource) {
    return this.#workletsModuleProxy.createSerializableObject(obj, shouldRetainRemote, nativeStateSource);
  }
  createSerializableHostObject(obj) {
    return this.#workletsModuleProxy.createSerializableHostObject(obj);
  }
  createSerializableArray(array, shouldRetainRemote) {
    return this.#workletsModuleProxy.createSerializableArray(array, shouldRetainRemote);
  }
  createSerializableMap(keys, values) {
    return this.#workletsModuleProxy.createSerializableMap(keys, values);
  }
  createSerializableSet(values) {
    return this.#workletsModuleProxy.createSerializableSet(values);
  }
  createSerializableInitializer(obj) {
    return this.#workletsModuleProxy.createSerializableInitializer(obj);
  }
  createSerializableFunction(func) {
    return this.#workletsModuleProxy.createSerializableFunction(func);
  }
  createSerializableWorklet(worklet, shouldPersistRemote) {
    return this.#workletsModuleProxy.createSerializableWorklet(worklet, shouldPersistRemote);
  }
  scheduleOnUI(serializable) {
    return this.#workletsModuleProxy.scheduleOnUI(serializable);
  }
  executeOnUIRuntimeSync(serializable) {
    return this.#workletsModuleProxy.executeOnUIRuntimeSync(serializable);
  }
  createWorkletRuntime(name, initializer, useDefaultQueue, customQueue, enableEventLoop) {
    return this.#workletsModuleProxy.createWorkletRuntime(name, initializer, useDefaultQueue, customQueue, enableEventLoop);
  }
  scheduleOnRuntime(workletRuntime, serializableWorklet) {
    return this.#workletsModuleProxy.scheduleOnRuntime(workletRuntime, serializableWorklet);
  }
  createSynchronizable(value) {
    return this.#workletsModuleProxy.createSynchronizable(value);
  }
  synchronizableGetDirty(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableGetDirty(synchronizableRef);
  }
  synchronizableGetBlocking(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableGetBlocking(synchronizableRef);
  }
  synchronizableSetBlocking(synchronizableRef, value) {
    return this.#workletsModuleProxy.synchronizableSetBlocking(synchronizableRef, value);
  }
  synchronizableLock(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableLock(synchronizableRef);
  }
  synchronizableUnlock(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableUnlock(synchronizableRef);
  }
  reportFatalErrorOnJS(message, stack, name, jsEngine) {
    return this.#workletsModuleProxy.reportFatalErrorOnJS(message, stack, name, jsEngine);
  }
  getStaticFeatureFlag(name) {
    return this.#workletsModuleProxy.getStaticFeatureFlag(name);
  }
  setDynamicFeatureFlag(name, value) {
    this.#workletsModuleProxy.setDynamicFeatureFlag(name, value);
  }
}
//# sourceMappingURL=NativeWorklets.js.map