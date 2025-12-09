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
    if (__DEV__ && globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
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
  ): SerializableRef<TValue> {
    return this.#workletsModuleProxy.createSerializableImport(from, to);
  }

  createSerializableString(str: string) {
    return this.#workletsModuleProxy.createSerializableString(str);
  }

  createSerializableNumber(num: number) {
    return this.#workletsModuleProxy.createSerializableNumber(num);
  }

  createSerializableBoolean(bool: boolean) {
    return bool ? this.#serializableTrue : this.#serializableFalse;
  }

  createSerializableBigInt(bigInt: bigint) {
    return this.#workletsModuleProxy.createSerializableBigInt(bigInt);
  }

  createSerializableUndefined() {
    return this.#serializableUndefined;
  }

  createSerializableNull() {
    return this.#serializableNull;
  }

  createSerializableTurboModuleLike<
    TProps extends object,
    TProto extends object,
  >(props: TProps, proto: TProto): SerializableRef<TProps> {
    return this.#workletsModuleProxy.createSerializableTurboModuleLike(
      props,
      proto
    );
  }

  createSerializableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): SerializableRef<T> {
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
  ): SerializableRef<Map<TKey, TValue>> {
    return this.#workletsModuleProxy.createSerializableMap(keys, values);
  }

  createSerializableSet<TValues>(
    values: TValues[]
  ): SerializableRef<Set<TValues>> {
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

  createCustomSerializable(
    data: SerializableRef<unknown>,
    typeId: number
  ): SerializableRef<unknown> {
    return this.#workletsModuleProxy.createCustomSerializable(data, typeId);
  }

  registerCustomSerializable(
    determine: SerializableRef<object>,
    pack: SerializableRef<object>,
    unpack: SerializableRef<object>,
    typeId: number
  ): void {
    this.#workletsModuleProxy.registerCustomSerializable(
      determine,
      pack,
      unpack,
      typeId
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

  scheduleOnRuntime<T>(
    workletRuntime: WorkletRuntime,
    serializableWorklet: SerializableRef<T>
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
