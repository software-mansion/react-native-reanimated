'use strict';

import { checkCppVersion } from '../debug/checkCppVersion';
import { jsVersion } from '../debug/jsVersion';
import { installCustomSerializableUnpacker } from '../memory/customSerializableUnpacker';
import { installRemoteFunctionUnpacker } from '../memory/remoteFunctionUnpacker';
import { installShareableGuestUnpacker } from '../memory/shareableGuestUnpacker';
import { installShareableHostUnpacker } from '../memory/shareableHostUnpacker';
import { installSynchronizableUnpacker } from '../memory/synchronizableUnpacker';
import type {
  RemoteFunction,
  SerializableRef,
  SynchronizableRef,
} from '../memory/types';
import { installValueUnpacker } from '../memory/valueUnpacker';
import { isRNRuntime } from '../runtimeKind';
import { WorkletsTurboModule } from '../specs';
import type { WorkletFunction, WorkletRuntime } from '../types';
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
    const bundleModeEnabled = globalThis._WORKLETS_BUNDLE_MODE_ENABLED ?? false;
    globalThis._WORKLETS_VERSION_JS = jsVersion;
    const onRNRuntime = isRNRuntime();
    if (globalThis.__workletsModuleProxy === undefined && onRNRuntime) {
      WorkletsTurboModule?.installTurboModule(bundleModeEnabled);
      if (!bundleModeEnabled) {
        installUnpackers(globalThis.__workletsModuleProxy);
      }
      WorkletsTurboModule?.start();
    }
    if (globalThis.__workletsModuleProxy === undefined) {
      throw new Error(
        `[Worklets] Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#native-part-of-worklets-doesnt-seem-to-be-initialized for more details.`
      );
    }
    if (__DEV__) {
      if (bundleModeEnabled) {
        console.log(
          '[Worklets] Bundle mode initialization: Downloaded the bundle for Worklet Runtimes.'
        );
      }
      if (onRNRuntime) {
        checkCppVersion();
      }
    }
    this.#workletsModuleProxy = globalThis.__workletsModuleProxy;
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

  createSerializableArray(
    array: unknown[],
    shouldRetainRemote: boolean = false
  ) {
    return this.#workletsModuleProxy.createSerializableArray(
      array,
      shouldRetainRemote
    );
  }

  createSerializableArrayBuffer(arrayBuffer: ArrayBuffer) {
    return this.#workletsModuleProxy.createSerializableArrayBuffer(arrayBuffer);
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

  createSerializableError(
    name: string,
    message: string,
    stack: string | undefined
  ): SerializableRef<Error> {
    return this.#workletsModuleProxy.createSerializableError(
      name,
      message,
      stack
    );
  }

  createSerializableRegExp(
    pattern: string,
    flags: string
  ): SerializableRef<RegExp> {
    return this.#workletsModuleProxy.createSerializableRegExp(pattern, flags);
  }

  createSerializableInitializer(obj: object) {
    return this.#workletsModuleProxy.createSerializableInitializer(obj);
  }

  createSerializableNonWorkletFunction<TArgs extends unknown[], TReturn>(
    fun: (...args: TArgs) => TReturn,
    functionId: number,
    functionName: string | undefined
  ): SerializableRef<(...args: TArgs) => TReturn> {
    return this.#workletsModuleProxy.createSerializableNonWorkletFunction(
      fun,
      functionId,
      functionName
    );
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

  createShareable<TValue = unknown>(
    hostRuntimeId: number,
    initial: SerializableRef<TValue>,
    initSynchronously: boolean,
    decorateHost: SerializableRef,
    decorateRef: SerializableRef
  ): SerializableRef<TValue> {
    return this.#workletsModuleProxy.createShareable(
      hostRuntimeId,
      initial,
      initSynchronously,
      decorateHost,
      decorateRef
    );
  }

  scheduleOnRN<TArgs extends unknown[]>(
    fun: RemoteFunction | ((...args: TArgs) => unknown),
    args: SerializableRef<TArgs> | undefined
  ): void {
    this.#workletsModuleProxy.scheduleOnRN(fun, args);
  }

  scheduleOnUI<TValue>(
    serializableArrayOfWorklets: SerializableRef<TValue[]>,
    scheduleStacks: string[] | undefined
  ) {
    return this.#workletsModuleProxy.scheduleOnUI(
      serializableArrayOfWorklets,
      scheduleStacks
    );
  }

  runOnUISync<TValue, TReturn>(
    worklet: SerializableRef<TValue>,
    scheduleStack: string | undefined
  ): TReturn {
    return this.#workletsModuleProxy.runOnUISync(worklet, scheduleStack);
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
    serializableWorklet: SerializableRef<TValue>,
    scheduleStack: string | undefined
  ) {
    return this.#workletsModuleProxy.scheduleOnRuntime(
      workletRuntime,
      serializableWorklet,
      scheduleStack
    );
  }

  scheduleOnRuntimeWithId<TValue>(
    runtimeId: number,
    worklet: SerializableRef<TValue>,
    scheduleStack: string | undefined
  ) {
    return this.#workletsModuleProxy.scheduleOnRuntimeWithId(
      runtimeId,
      worklet,
      scheduleStack
    );
  }

  runOnRuntimeSync<TValue, TReturn>(
    workletRuntime: WorkletRuntime,
    worklet: SerializableRef<TValue>,
    scheduleStack: string | undefined
  ): TReturn {
    return this.#workletsModuleProxy.runOnRuntimeSync(
      workletRuntime,
      worklet,
      scheduleStack
    );
  }

  runOnRuntimeSyncWithId<TValue, TReturn>(
    runtimeId: number,
    worklet: SerializableRef<TValue>,
    scheduleStack: string | undefined
  ): TReturn {
    return this.#workletsModuleProxy.runOnRuntimeSyncWithId(
      runtimeId,
      worklet,
      scheduleStack
    );
  }

  handlePromise<TValue>(
    resolveOrReject:
      | ((value: TValue | PromiseLike<TValue>) => void)
      | RemoteFunction,
    valueOrError: SerializableRef<TValue>
  ) {
    return this.#workletsModuleProxy.handlePromise(
      resolveOrReject,
      valueOrError
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

  reportFatalErrorOnJS(message: string, stack: string, name: string) {
    return this.#workletsModuleProxy.reportFatalErrorOnJS(message, stack, name);
  }

  getStaticFeatureFlag(name: string): boolean {
    return this.#workletsModuleProxy.getStaticFeatureFlag(name);
  }

  setDynamicFeatureFlag(name: string, value: boolean) {
    this.#workletsModuleProxy.setDynamicFeatureFlag(name, value);
  }

  getUIRuntimeHolder(): object {
    return this.#workletsModuleProxy.getUIRuntimeHolder();
  }

  getUISchedulerHolder(): object {
    return this.#workletsModuleProxy.getUISchedulerHolder();
  }

  toggleSlowAnimationsOnUIRuntime(): boolean {
    return WorkletsTurboModule?.toggleSlowAnimationsOnUIRuntime() ?? false;
  }
}

export const WorkletsModule: IWorkletsModule = new NativeWorklets();

function installUnpackers(workletsModuleProxy: WorkletsModuleProxy) {
  workletsModuleProxy.loadUnpackers(
    (installValueUnpacker as WorkletFunction).__initData!.code,
    (installValueUnpacker as WorkletFunction).__initData!.location ?? '',
    (installValueUnpacker as WorkletFunction).__initData!.sourceMap ?? '',
    (installSynchronizableUnpacker as WorkletFunction).__initData!.code,
    (installSynchronizableUnpacker as WorkletFunction).__initData!.location ??
      '',
    (installSynchronizableUnpacker as WorkletFunction).__initData!.sourceMap ??
      '',
    (installCustomSerializableUnpacker as WorkletFunction).__initData!.code,
    (installCustomSerializableUnpacker as WorkletFunction).__initData!
      .location ?? '',
    (installCustomSerializableUnpacker as WorkletFunction).__initData!
      .sourceMap ?? '',
    (installShareableHostUnpacker as WorkletFunction).__initData!.code,
    (installShareableHostUnpacker as WorkletFunction).__initData!.location ??
      '',
    (installShareableHostUnpacker as WorkletFunction).__initData!.sourceMap ??
      '',
    (installShareableGuestUnpacker as WorkletFunction).__initData!.code,
    (installShareableGuestUnpacker as WorkletFunction).__initData!.location ??
      '',
    (installShareableGuestUnpacker as WorkletFunction).__initData!.sourceMap ??
      '',
    (installRemoteFunctionUnpacker as WorkletFunction).__initData!.code,
    (installRemoteFunctionUnpacker as WorkletFunction).__initData!.location ??
      '',
    (installRemoteFunctionUnpacker as WorkletFunction).__initData!.sourceMap ??
      ''
  );
}
