'use strict';

import type { ShareableRef, WorkletRuntime } from '../workletTypes';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  makeShareableClone<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<TValue>;

  makeShareableString(str: string): ShareableRef<string>;

  makeShareableNumber(num: number): ShareableRef<number>;

  makeShareableBoolean(bool: boolean): ShareableRef<boolean>;

  makeShareableBigInt(bigInt: bigint): ShareableRef<bigint>;

  makeShareableArray(
    array: unknown[],
    shouldRetainRemote: boolean
  ): ShareableRef<unknown[]>;

  makeShareableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T>;

  makeShareableHostObject<T extends object>(hostObject: T): ShareableRef<T>;

  makeShareableInitializer(initializer: object): ShareableRef<object>;

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
