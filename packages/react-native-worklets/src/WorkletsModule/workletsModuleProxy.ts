'use strict';

import type {
  RemoteFunction,
  SerializableRef,
  SynchronizableRef,
} from '../memory/types';
import type { WorkletRuntime } from '../types';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  loadUnpackers(
    valueUnpackerCode: string,
    valueUnpackerLocation: string,
    valueUnpackerSourceMap: string,
    synchronizableUnpackerCode: string,
    synchronizableUnpackerLocation: string,
    synchronizableUnpackerSourceMap: string,
    customSerializableUnpackerCode: string,
    customSerializableUnpackerLocation: string,
    customSerializableUnpackerSourceMap: string,
    shareableHostUnpackerCode: string,
    shareableHostUnpackerLocation: string,
    shareableHostUnpackerSourceMap: string,
    shareableGuestUnpackerCode: string,
    shareableGuestUnpackerLocation: string,
    shareableGuestUnpackerSourceMap: string,
    remoteFunctionUnpackerCode: string,
    remoteFunctionUnpackerLocation: string,
    remoteFunctionUnpackerSourceMap: string
  ): void;

  createSerializableImport<TValue>(
    source: string,
    imported: string
  ): SerializableRef<TValue>;

  createSerializableString(str: string): SerializableRef<string>;

  createSerializableNumber(num: number): SerializableRef<number>;

  createSerializableBoolean(bool: boolean): SerializableRef<boolean>;

  createSerializableBigInt(bigInt: bigint): SerializableRef<bigint>;

  createSerializableUndefined(): SerializableRef<undefined>;

  createSerializableNull(): SerializableRef<null>;

  createSerializableTurboModuleLike<
    TProps extends object,
    TProto extends object,
  >(
    props: TProps,
    proto: TProto
  ): SerializableRef<TProps>;

  createSerializableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): SerializableRef<T>;

  createSerializableHostObject<T extends object>(obj: T): SerializableRef<T>;

  createSerializableArray(
    array: unknown[],
    shouldRetainRemote?: boolean
  ): SerializableRef<unknown[]>;

  createSerializableArrayBuffer(
    arrayBuffer: ArrayBuffer
  ): SerializableRef<ArrayBuffer>;

  createSerializableMap<TKey, TValue>(
    keys: TKey[],
    values: TValue[]
  ): SerializableRef<Map<TKey, TValue>>;

  createSerializableSet<TValues>(
    values: TValues[]
  ): SerializableRef<Set<TValues>>;

  createSerializableError(
    name: string,
    message: string,
    stack: string | undefined
  ): SerializableRef<Error>;

  createSerializableRegExp(
    pattern: string,
    flags: string
  ): SerializableRef<RegExp>;

  createSerializableInitializer(obj: object): SerializableRef<object>;

  createSerializableNonWorkletFunction<TArgs extends unknown[], TReturn>(
    fun: (...args: TArgs) => TReturn,
    functionId: number,
    functionName: string | undefined
  ): SerializableRef<(...args: TArgs) => TReturn>;

  createSerializableWorklet(
    worklet: object,
    shouldPersistRemote: boolean
  ): SerializableRef<object>;

  createCustomSerializable(
    data: SerializableRef<unknown>,
    typeId: number
  ): SerializableRef<unknown>;

  registerCustomSerializable(
    determine: SerializableRef<object>,
    pack: SerializableRef<object>,
    unpack: SerializableRef<object>,
    typeId: number
  ): void;

  createShareable<TValue = unknown>(
    hostRuntimeId: number,
    initial: SerializableRef<TValue>,
    initSynchronously: boolean,
    decorateHost: SerializableRef,
    decorateGuest: SerializableRef
  ): SerializableRef<TValue>;

  scheduleOnRN<TArgs extends unknown[]>(
    fun: RemoteFunction | ((...args: TArgs) => unknown),
    args: SerializableRef<TArgs> | undefined
  ): void;

  scheduleOnUI<TValue>(
    serializableArrayOfWorklets: SerializableRef<TValue[]>,
    scheduleStacks: string[] | undefined
  ): void;

  runOnUISync<TValue, TReturn>(
    serializable: SerializableRef<TValue>,
    scheduleStack: string | undefined
  ): TReturn;

  createWorkletRuntime(
    name: string,
    initializer: SerializableRef<() => void>,
    useDefaultQueue: boolean,
    customQueue: object | undefined,
    enableEventLoop: boolean
  ): WorkletRuntime;

  scheduleOnRuntime<TValue>(
    workletRuntime: WorkletRuntime,
    worklet: SerializableRef<TValue>,
    scheduleStack?: string
  ): void;

  scheduleOnRuntimeWithId<TValue>(
    runtimeId: number,
    worklet: SerializableRef<TValue>,
    scheduleStack?: string
  ): void;

  runOnRuntimeSync<TValue, TReturn>(
    workletRuntime: WorkletRuntime,
    worklet: SerializableRef<TValue>,
    scheduleStack?: string
  ): TReturn;

  runOnRuntimeSyncWithId<TValue, TReturn>(
    runtimeId: number,
    worklet: SerializableRef<TValue>,
    scheduleStack?: string
  ): TReturn;

  handlePromise<TValue>(
    resolveOrReject:
      | ((value: TValue | PromiseLike<TValue>) => void)
      | RemoteFunction,
    valueOrError: SerializableRef<TValue>
  ): void;

  reportFatalErrorOnJS(message: string, stack: string, name: string): void;

  createSynchronizable<TValue>(value: TValue): SynchronizableRef<TValue>;

  synchronizableGetDirty<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): TValue;

  synchronizableGetBlocking<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): TValue;

  synchronizableSetBlocking<TValue>(
    synchronizableRef: SynchronizableRef<TValue>,
    value: SerializableRef<TValue>
  ): void;

  synchronizableLock<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): void;

  synchronizableUnlock<TValue>(
    synchronizableRef: SynchronizableRef<TValue>
  ): void;

  getStaticFeatureFlag(name: string): boolean;

  setDynamicFeatureFlag(name: string, value: boolean): void;

  getUIRuntimeHolder(): object;

  getUISchedulerHolder(): object;

  /** @deprecated Don't use unless you have to. */
  createSerializableLEGACY<TValue>(
    value: TValue,
    nativeStateSource: object | undefined
  ): SerializableRef<TValue>;
}

type InternalMethods = 'loadUnpackers' | 'createSerializableLEGACY';

type TurboModulePublic = {
  toggleSlowAnimationsOnUIRuntime(): boolean;
};

export type IWorkletsModule = Omit<WorkletsModuleProxy, InternalMethods> &
  TurboModulePublic;
