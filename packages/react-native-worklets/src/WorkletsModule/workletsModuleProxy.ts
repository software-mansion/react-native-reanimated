'use strict';

import type { SerializableRef, SynchronizableRef } from '../memory/types';
import type { WorkletRuntime } from '../types';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
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
    memoize: boolean,
    props: TProps,
    proto: TProto
  ): SerializableRef<TProps>;

  createSerializableObject<TValue extends object>(
    memoize: boolean,
    obj: TValue,
    nativeStateSource?: object
  ): SerializableRef<TValue>;

  createSerializableHostObject<TValue extends object>(
    memoize: boolean,
    obj: TValue
  ): SerializableRef<TValue>;

  createSerializableArrayBuffer<TValue extends ArrayBuffer>(
    memoize: boolean,
    arrayBuffer: TValue
  ): SerializableRef<TValue>;

  createSerializableArray(
    memoize: boolean,
    array: unknown[]
  ): SerializableRef<unknown[]>;

  createSerializableMap<TKey, TValue>(
    memoize: boolean,
    keys: TKey[],
    values: TValue[]
  ): SerializableRef<Map<TKey, TValue>>;

  createSerializableSet<TValues>(
    memoize: boolean,
    values: TValues[]
  ): SerializableRef<Set<TValues>>;

  createSerializableInitializer(obj: object): SerializableRef<object>;

  createSerializableRemoteFunction<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn
  ): SerializableRef<TReturn>;

  createSerializableRemoteFunctionDev<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn,
    name: string
  ): SerializableRef<TReturn>;

  createSerializableWorklet(
    memoize: boolean,
    worklet: object
  ): SerializableRef<object>;

  scheduleOnUI<TValue>(serializable: SerializableRef<TValue>): void;

  executeOnUIRuntimeSync<TValue, TReturn>(
    serializable: SerializableRef<TValue>
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
    worklet: SerializableRef<TValue>
  ): void;

  reportFatalErrorOnJS(
    message: string,
    stack: string,
    name: string,
    jsEngine: string
  ): void;

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
}

export type IWorkletsModule = WorkletsModuleProxy;
