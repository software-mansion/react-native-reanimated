'use strict';

import { WorkletsTurboModule } from '../specs';
import { checkCppVersion } from '../utils/checkCppVersion';
import { jsVersion } from '../utils/jsVersion';
import { WorkletsError } from '../WorkletsError';
import type { ShareableRef, WorkletRuntime } from '../workletTypes';
import type {
  IWorkletsModule,
  WorkletsModuleProxy,
} from './workletsModuleProxy';

export function createNativeWorkletsModule(): IWorkletsModule {
  return new NativeWorklets();
}

class NativeWorklets implements IWorkletsModule {
  #workletsModuleProxy: WorkletsModuleProxy;
  #shareableUndefined: ShareableRef<undefined>;
  #shareableNull: ShareableRef<null>;
  #shareableTrue: ShareableRef<boolean>;
  #shareableFalse: ShareableRef<boolean>;

  constructor() {
    globalThis._WORKLETS_VERSION_JS = jsVersion;
    if (global.__workletsModuleProxy === undefined && !globalThis._WORKLET) {
      WorkletsTurboModule?.installTurboModule();
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new WorkletsError(
        `Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#native-part-of-worklets-doesnt-seem-to-be-initialized for more details.`
      );
    }
    if (__DEV__) {
      checkCppVersion();
    }
    this.#workletsModuleProxy = global.__workletsModuleProxy;
    this.#shareableNull = this.#workletsModuleProxy.createSerializableNull();
    this.#shareableUndefined =
      this.#workletsModuleProxy.createSerializableUndefined();
    this.#shareableTrue =
      this.#workletsModuleProxy.createSerializableBoolean(true);
    this.#shareableFalse =
      this.#workletsModuleProxy.createSerializableBoolean(false);
  }

  createSerializable<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) {
    return this.#workletsModuleProxy.createSerializable(
      value,
      shouldPersistRemote,
      nativeStateSource
    );
  }

  createSerializableImport<TValue>(
    from: string,
    to: string
  ): ShareableRef<TValue> {
    return this.#workletsModuleProxy.createSerializableImport(from, to);
  }

  createSerializableString(str: string) {
    return this.#workletsModuleProxy.createSerializableString(str);
  }

  createSerializableNumber(num: number) {
    return this.#workletsModuleProxy.createSerializableNumber(num);
  }

  createSerializableBoolean(bool: boolean) {
    return bool ? this.#shareableTrue : this.#shareableFalse;
  }

  createSerializableBigInt(bigInt: bigint) {
    return this.#workletsModuleProxy.createSerializableBigInt(bigInt);
  }

  createSerializableUndefined() {
    return this.#shareableUndefined;
  }

  createSerializableNull() {
    return this.#shareableNull;
  }

  createSerializableTurboModuleLike<
    TProps extends object,
    TProto extends object,
  >(props: TProps, proto: TProto): ShareableRef<TProps> {
    return this.#workletsModuleProxy.createSerializableTurboModuleLike(
      props,
      proto
    );
  }

  createSerializableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T> {
    return this.#workletsModuleProxy.createSerializableObject(
      obj,
      shouldRetainRemote,
      nativeStateSource
    );
  }

  createSerializableHostObject<T extends object>(obj: T) {
    return this.#workletsModuleProxy.createSerializableHostObject(obj);
  }

  createSerializableArray(array: unknown[], shouldRetainRemote: boolean) {
    return this.#workletsModuleProxy.createSerializableArray(
      array,
      shouldRetainRemote
    );
  }

  createSerializableMap<TKey, TValue>(
    keys: TKey[],
    values: TValue[]
  ): ShareableRef<Map<TKey, TValue>> {
    return this.#workletsModuleProxy.createSerializableMap(keys, values);
  }

  createSerializableSet<TValues>(
    values: TValues[]
  ): ShareableRef<Set<TValues>> {
    return this.#workletsModuleProxy.createSerializableSet(values);
  }

  createSerializableInitializer(obj: object) {
    return this.#workletsModuleProxy.createSerializableInitializer(obj);
  }

  createSerializableFunction<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn
  ) {
    return this.#workletsModuleProxy.createSerializableFunction(func);
  }

  createSerializableWorklet(worklet: object, shouldPersistRemote: boolean) {
    return this.#workletsModuleProxy.createSerializableWorklet(
      worklet,
      shouldPersistRemote
    );
  }

  scheduleOnUI<TValue>(shareable: ShareableRef<TValue>) {
    return this.#workletsModuleProxy.scheduleOnUI(shareable);
  }

  executeOnUIRuntimeSync<TValue, TReturn>(
    shareable: ShareableRef<TValue>
  ): TReturn {
    return this.#workletsModuleProxy.executeOnUIRuntimeSync(shareable);
  }

  createWorkletRuntime(name: string, initializer: ShareableRef<() => void>) {
    return this.#workletsModuleProxy.createWorkletRuntime(name, initializer);
  }

  scheduleOnRuntime<T>(
    workletRuntime: WorkletRuntime,
    shareableWorklet: ShareableRef<T>
  ) {
    return this.#workletsModuleProxy.scheduleOnRuntime(
      workletRuntime,
      shareableWorklet
    );
  }

  reportFatalErrorOnJS(
    message: string,
    stack: string,
    name: string,
    jsEngine: string
  ) {
    return this.#workletsModuleProxy.reportFatalErrorOnJS(
      message,
      stack,
      name,
      jsEngine
    );
  }

  setDynamicFeatureFlag(name: string, value: boolean) {
    this.#workletsModuleProxy.setDynamicFeatureFlag(name, value);
  }
}
