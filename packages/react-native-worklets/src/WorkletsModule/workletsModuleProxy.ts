'use strict';

import type { SerializableRef, WorkletRuntime } from '../workletTypes';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  createSerializable<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): SerializableRef<TValue>;

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
    shouldRetainRemote: boolean
  ): SerializableRef<unknown[]>;

  createSerializableMap<TKey, TValue>(
    keys: TKey[],
    values: TValue[]
  ): SerializableRef<Map<TKey, TValue>>;

  createSerializableSet<TValues>(values: TValues[]): SerializableRef<Set<TValues>>;

  createSerializableInitializer(obj: object): SerializableRef<object>;

  createSerializableFunction<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn
  ): SerializableRef<TReturn>;

  createSerializableWorklet(
    worklet: object,
    shouldPersistRemote: boolean
  ): SerializableRef<object>;

  scheduleOnUI<TValue>(shareable: SerializableRef<TValue>): void;

  executeOnUIRuntimeSync<TValue, TReturn>(
    shareable: SerializableRef<TValue>
  ): TReturn;

  createWorkletRuntime(
    name: string,
    initializer: SerializableRef<() => void>,
    useDefaultQueue: boolean,
    customQueue: object | undefined
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

  setDynamicFeatureFlag(name: string, value: boolean): void;
}

export type IWorkletsModule = WorkletsModuleProxy;
