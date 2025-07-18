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
    this.#shareableNull = this.#workletsModuleProxy.makeShareableNull();
    this.#shareableUndefined =
      this.#workletsModuleProxy.makeShareableUndefined();
    this.#shareableTrue = this.#workletsModuleProxy.makeShareableBoolean(true);
    this.#shareableFalse =
      this.#workletsModuleProxy.makeShareableBoolean(false);
  }

  makeShareableClone<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) {
    return this.#workletsModuleProxy.makeShareableClone(
      value,
      shouldPersistRemote,
      nativeStateSource
    );
  }

  makeShareableImport<TValue>(from: string, to: string): ShareableRef<TValue> {
    return this.#workletsModuleProxy.makeShareableImport(from, to);
  }

  makeShareableString(str: string) {
    return this.#workletsModuleProxy.makeShareableString(str);
  }

  makeShareableNumber(num: number) {
    return this.#workletsModuleProxy.makeShareableNumber(num);
  }

  makeShareableBoolean(bool: boolean) {
    return bool ? this.#shareableTrue : this.#shareableFalse;
  }

  makeShareableBigInt(bigInt: bigint) {
    return this.#workletsModuleProxy.makeShareableBigInt(bigInt);
  }

  makeShareableUndefined() {
    return this.#shareableUndefined;
  }

  makeShareableNull() {
    return this.#shareableNull;
  }

  makeShareableTurboModuleLike<TProps extends object, TProto extends object>(
    props: TProps,
    proto: TProto
  ): ShareableRef<TProps> {
    return this.#workletsModuleProxy.makeShareableTurboModuleLike(props, proto);
  }

  makeShareableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T> {
    return this.#workletsModuleProxy.makeShareableObject(
      obj,
      shouldRetainRemote,
      nativeStateSource
    );
  }

  makeShareableHostObject<T extends object>(obj: T) {
    return this.#workletsModuleProxy.makeShareableHostObject(obj);
  }

  makeShareableArray(array: unknown[], shouldRetainRemote: boolean) {
    return this.#workletsModuleProxy.makeShareableArray(
      array,
      shouldRetainRemote
    );
  }

  makeShareableMap<TKey, TValue>(
    keys: TKey[],
    values: TValue[]
  ): ShareableRef<Map<TKey, TValue>> {
    return this.#workletsModuleProxy.makeShareableMap(keys, values);
  }

  makeShareableSet<TValues>(values: TValues[]): ShareableRef<Set<TValues>> {
    return this.#workletsModuleProxy.makeShareableSet(values);
  }

  makeShareableInitializer(obj: object) {
    return this.#workletsModuleProxy.makeShareableInitializer(obj);
  }

  makeShareableFunction<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn
  ) {
    return this.#workletsModuleProxy.makeShareableFunction(func);
  }

  makeShareableWorklet(worklet: object, shouldPersistRemote: boolean) {
    return this.#workletsModuleProxy.makeShareableWorklet(
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
