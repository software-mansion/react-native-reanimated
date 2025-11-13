'use strict';

import { checkCppVersion } from '../debug/checkCppVersion';
import { jsVersion } from '../debug/jsVersion';
import { WorkletsError } from '../debug/WorkletsError';
import type { SerializableRef, SynchronizableRef } from '../memory/types';
import { RuntimeKind } from '../runtimeKind';
import { WorkletsTurboModule } from '../specs';
import type { WorkletRuntime } from '../types';
import type {
  IWorkletsModule,
  WorkletsModuleProxy,
} from './workletsModuleProxy';

class NativeWorklets implements IWorkletsModule {
  #workletsModuleProxy: WorkletsModuleProxy;
  #serializableUndefined: SerializableRef<undefined>;
  #serializableNull: SerializableRef<null>;
  #serializableTrue: SerializableRef<boolean>;
  #serializableFalse: SerializableRef<boolean>;

  constructor() {
    globalThis._WORKLETS_VERSION_JS = jsVersion;
    if (
      global.__workletsModuleProxy === undefined &&
      globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative
    ) {
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
    this.#serializableNull = this.#workletsModuleProxy.createSerializableNull();
    this.#serializableUndefined =
      this.#workletsModuleProxy.createSerializableUndefined();
    this.#serializableTrue =
      this.#workletsModuleProxy.createSerializableBoolean(true);
    this.#serializableFalse =
      this.#workletsModuleProxy.createSerializableBoolean(false);
  }

  createSerializableImport<TValue>(
    from: string,
    to: string
  ): SerializableRef<TValue> {
    console.log('NativeWorklets.createSerializableImport called');
    return this.#workletsModuleProxy.createSerializableImport(from, to);
  }

  createSerializableString(str: string) {
    console.log('NativeWorklets.createSerializableString called');
    return this.#workletsModuleProxy.createSerializableString(str);
  }

  createSerializableNumber(num: number) {
    console.log('NativeWorklets.createSerializableNumber called');
    return this.#workletsModuleProxy.createSerializableNumber(num);
  }

  createSerializableBoolean(bool: boolean) {
    console.log('NativeWorklets.createSerializableBoolean called');
    return bool ? this.#serializableTrue : this.#serializableFalse;
  }

  createSerializableBigInt(bigInt: bigint) {
    console.log('NativeWorklets.createSerializableBigInt called');
    return this.#workletsModuleProxy.createSerializableBigInt(bigInt);
  }

  createSerializableUndefined() {
    console.log('NativeWorklets.createSerializableUndefined called');
    return this.#serializableUndefined;
  }

  createSerializableNull() {
    console.log('NativeWorklets.createSerializableNull called');
    return this.#serializableNull;
  }

  createSerializableTurboModuleLike<
    TProps extends object,
    TProto extends object,
  >(memoize: boolean, props: TProps, proto: TProto): SerializableRef<TProps> {
    console.log('NativeWorklets.createSerializableTurboModuleLike called');
    return this.#workletsModuleProxy.createSerializableTurboModuleLike(
      memoize,
      props,
      proto
    );
  }

  createSerializableArrayBuffer<TValue extends ArrayBuffer>(
    memoize: boolean,
    arrayBuffer: TValue
  ): SerializableRef<TValue> {
    console.log('NativeWorklets.createSerializableArrayBuffer called');
    return this.#workletsModuleProxy.createSerializableArrayBuffer(
      memoize,
      arrayBuffer
    );
  }

  createSerializableObject<TValue extends object>(
    memoize: boolean,
    obj: TValue,
    nativeStateSource?: object
  ): SerializableRef<TValue> {
    console.log('NativeWorklets.createSerializableObject called');
    return this.#workletsModuleProxy.createSerializableObject(
      memoize,
      obj,
      nativeStateSource
    );
  }

  createSerializableHostObject<TValue extends object>(
    memoize: boolean,
    obj: TValue
  ) {
    console.log('NativeWorklets.createSerializableHostObject called');
    return this.#workletsModuleProxy.createSerializableHostObject(memoize, obj);
  }

  createSerializableArray(memoize: boolean, array: unknown[]) {
    console.log('NativeWorklets.createSerializableArray called');
    return this.#workletsModuleProxy.createSerializableArray(memoize, array);
  }

  createSerializableMap<TKey, TValue>(
    memoize: boolean,
    keys: TKey[],
    values: TValue[]
  ): SerializableRef<Map<TKey, TValue>> {
    console.log('NativeWorklets.createSerializableMap called');
    return this.#workletsModuleProxy.createSerializableMap(
      memoize,
      keys,
      values
    );
  }

  createSerializableSet<TValues>(
    memoize: boolean,
    values: TValues[]
  ): SerializableRef<Set<TValues>> {
    console.log('NativeWorklets.createSerializableSet called');
    return this.#workletsModuleProxy.createSerializableSet(memoize, values);
  }

  createSerializableInitializer(obj: object) {
    console.log('NativeWorklets.createSerializableInitializer called');
    return this.#workletsModuleProxy.createSerializableInitializer(obj);
  }

  createSerializableRemoteFunction<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn
  ) {
    console.log('NativeWorklets.createSerializableRemoteFunction called');
    return this.#workletsModuleProxy.createSerializableRemoteFunction(func);
  }

  createSerializableRemoteFunctionDev<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn,
    name: string
  ) {
    console.log('NativeWorklets.createSerializableRemoteFunctionDev called');
    return this.#workletsModuleProxy.createSerializableRemoteFunctionDev(
      func,
      name
    );
  }

  createSerializableWorklet(memoize: boolean, worklet: object) {
    console.log('NativeWorklets.createSerializableWorklet called');
    console.log(worklet);
    console.log(Object.values(worklet));
    return this.#workletsModuleProxy.createSerializableWorklet(
      memoize,
      worklet
    );
  }

  scheduleOnUI<TValue>(serializable: SerializableRef<TValue>) {
    return this.#workletsModuleProxy.scheduleOnUI(serializable);
  }

  executeOnUIRuntimeSync<TValue, TReturn>(
    serializable: SerializableRef<TValue>
  ): TReturn {
    return this.#workletsModuleProxy.executeOnUIRuntimeSync(serializable);
  }

  createWorkletRuntime(
    name: string,
    initializer: SerializableRef<() => void>,
    useDefaultQueue: boolean,
    customQueue: object | undefined,
    enableEventLoop: boolean
  ) {
    return this.#workletsModuleProxy.createWorkletRuntime(
      name,
      initializer,
      useDefaultQueue,
      customQueue,
      enableEventLoop
    );
  }

  scheduleOnRuntime<TValue>(
    workletRuntime: WorkletRuntime,
    serializableWorklet: SerializableRef<TValue>
  ) {
    return this.#workletsModuleProxy.scheduleOnRuntime(
      workletRuntime,
      serializableWorklet
    );
  }

  createSynchronizable<TValue>(value: TValue): SynchronizableRef<TValue> {
    return this.#workletsModuleProxy.createSynchronizable(value);
  }

  synchronizableGetDirty<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): TValue {
    return this.#workletsModuleProxy.synchronizableGetDirty(synchronizableRef);
  }

  synchronizableGetBlocking<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): TValue {
    return this.#workletsModuleProxy.synchronizableGetBlocking(
      synchronizableRef
    );
  }

  synchronizableSetBlocking<TValue>(
    synchronizableRef: SynchronizableRef<TValue>,
    value: SerializableRef<TValue>
  ) {
    return this.#workletsModuleProxy.synchronizableSetBlocking(
      synchronizableRef,
      value
    );
  }

  synchronizableLock<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): void {
    return this.#workletsModuleProxy.synchronizableLock(synchronizableRef);
  }

  synchronizableUnlock<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): void {
    return this.#workletsModuleProxy.synchronizableUnlock(synchronizableRef);
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

  getStaticFeatureFlag(name: string): boolean {
    return this.#workletsModuleProxy.getStaticFeatureFlag(name);
  }

  setDynamicFeatureFlag(name: string, value: boolean) {
    this.#workletsModuleProxy.setDynamicFeatureFlag(name, value);
  }
}

export const WorkletsModule: IWorkletsModule = new NativeWorklets();
