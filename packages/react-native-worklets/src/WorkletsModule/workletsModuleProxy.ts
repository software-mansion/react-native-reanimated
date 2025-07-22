'use strict';

import type { ShareableRef, WorkletRuntime } from '../workletTypes';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  createSerializable<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<TValue>;

  createSerializableImport<TValue>(
    source: string,
    imported: string
  ): ShareableRef<TValue>;

  createSerializableString(str: string): ShareableRef<string>;

  createSerializableNumber(num: number): ShareableRef<number>;

  createSerializableBoolean(bool: boolean): ShareableRef<boolean>;

  createSerializableBigInt(bigInt: bigint): ShareableRef<bigint>;

  createSerializableUndefined(): ShareableRef<undefined>;

  createSerializableNull(): ShareableRef<null>;

  createSerializableTurboModuleLike<
    TProps extends object,
    TProto extends object,
  >(
    props: TProps,
    proto: TProto
  ): ShareableRef<TProps>;

  createSerializableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T>;

  createSerializableHostObject<T extends object>(obj: T): ShareableRef<T>;

  createSerializableArray(
    array: unknown[],
    shouldRetainRemote: boolean
  ): ShareableRef<unknown[]>;

  createSerializableMap<TKey, TValue>(
    keys: TKey[],
    values: TValue[]
  ): ShareableRef<Map<TKey, TValue>>;

  createSerializableSet<TValues>(values: TValues[]): ShareableRef<Set<TValues>>;

  createSerializableInitializer(obj: object): ShareableRef<object>;

  createSerializableFunction<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn
  ): ShareableRef<TReturn>;

  createSerializableWorklet(
    worklet: object,
    shouldPersistRemote: boolean
  ): ShareableRef<object>;

  scheduleOnUI<TValue>(shareable: ShareableRef<TValue>): void;

  executeOnUIRuntimeSync<TValue, TReturn>(
    shareable: ShareableRef<TValue>
  ): TReturn;

  createWorkletRuntime(
    name: string,
    initializer: ShareableRef<() => void>
  ): WorkletRuntime;

  scheduleOnRuntime<TValue>(
    workletRuntime: WorkletRuntime,
    worklet: ShareableRef<TValue>
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
