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

  makeShareableHostObject<T extends object>(obj: T): ShareableRef<T>;

  makeShareableArray(
    array: unknown[],
    shouldRetainRemote: boolean
  ): ShareableRef<unknown[]>;

  makeShareableInitializer(obj: object): ShareableRef<object>;

  makeShareableFunction(func: object): ShareableRef<object>;

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
}

export interface IWorkletsModule extends WorkletsModuleProxy {}
