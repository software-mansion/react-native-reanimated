'use strict';

import type { ShareableRef, WorkletRuntime } from '../workletTypes';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  makeShareableClone<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<TValue>;

  makeShareableImport<TValue>(
    source: string,
    imported: string
  ): ShareableRef<TValue>;

  makeShareableString(str: string): ShareableRef<string>;

  makeShareableNumber(num: number): ShareableRef<number>;

  makeShareableBoolean(bool: boolean): ShareableRef<boolean>;

  makeShareableBigInt(bigInt: bigint): ShareableRef<bigint>;

  makeShareableUndefined(): ShareableRef<undefined>;

  makeShareableNull(): ShareableRef<null>;

  makeShareableTurboModuleLike<TProps extends object, TProto extends object>(
    props: TProps,
    proto: TProto
  ): ShareableRef<TProps>;

  makeShareableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T>;

  makeShareableHostObject<T extends object>(obj: T): ShareableRef<T>;

  makeShareableArray(
    array: unknown[],
    shouldRetainRemote: boolean
  ): ShareableRef<unknown[]>;

  makeShareableMap<TKey, TValue>(
    keys: TKey[],
    values: TValue[]
  ): ShareableRef<Map<TKey, TValue>>;

  makeShareableSet<TValues>(values: TValues[]): ShareableRef<Set<TValues>>;

  makeShareableInitializer(obj: object): ShareableRef<object>;

  makeShareableFunction<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn
  ): ShareableRef<TReturn>;

  makeShareableWorklet(
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
