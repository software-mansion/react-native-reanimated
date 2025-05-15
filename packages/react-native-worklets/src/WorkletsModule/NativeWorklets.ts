/* eslint-disable @typescript-eslint/unbound-method */
'use strict';

import { WorkletsTurboModule } from '../specs';
import { WorkletsError } from '../WorkletsError';
import type { ShareableRef, WorkletRuntime } from '../workletTypes';
import type { WorkletsModuleProxy } from './workletsModuleProxy';

export interface IWorkletsModule extends WorkletsModuleProxy {}

export function createNativeWorkletsModule(): IWorkletsModule {
  return new NativeWorklets();
}

class NativeWorklets {
  #workletsModuleProxy: WorkletsModuleProxy;
  #shareableUndefined: ShareableRef<undefined>;
  #shareableNull: ShareableRef<null>;
  #shareableTrue: ShareableRef<boolean>;
  #shareableFalse: ShareableRef<boolean>;

  constructor() {
    if (global.__workletsModuleProxy === undefined) {
      WorkletsTurboModule?.installTurboModule();
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new WorkletsError(
        `Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    this.#workletsModuleProxy = {
      scheduleOnUI: global.__workletsModuleProxy.scheduleOnUI,
      scheduleOnRuntime: global.__workletsModuleProxy.scheduleOnRuntime,
      executeOnUIRuntimeSync:
        global.__workletsModuleProxy.executeOnUIRuntimeSync,
      createWorkletRuntime: global.__workletsModuleProxy.createWorkletRuntime,
      makeShareableClone: global.__workletsModuleProxy.makeShareableClone,
      makeShareableString: global.__workletsModuleProxy.makeShareableString,
      makeShareableNumber: global.__workletsModuleProxy.makeShareableNumber,
      makeShareableBoolean: global.__workletsModuleProxy.makeShareableBoolean,
      makeShareableBigInt: global.__workletsModuleProxy.makeShareableBigInt,
      makeShareableArray: global.__workletsModuleProxy.makeShareableArray,
      makeShareableObject: global.__workletsModuleProxy.makeShareableObject,
      makeShareableHostObject:
        global.__workletsModuleProxy.makeShareableHostObject,
      makeShareableInitializer:
        global.__workletsModuleProxy.makeShareableInitializer,
      makeShareableUndefined:
        global.__workletsModuleProxy.makeShareableUndefined,
      makeShareableNull: global.__workletsModuleProxy.makeShareableNull,
    };
    this.#shareableNull = this.#workletsModuleProxy.makeShareableNull();
    this.#shareableUndefined =
      this.#workletsModuleProxy.makeShareableUndefined();
    this.#shareableTrue = this.#workletsModuleProxy.makeShareableBoolean(true);
    this.#shareableFalse =
      this.#workletsModuleProxy.makeShareableBoolean(false);
  }

  makeShareableClone<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) {
    return this.#workletsModuleProxy.makeShareableClone(
      value,
      shouldPersistRemote,
      nativeStateSource
    );
  }

  makeShareableString(str: string) {
    return this.#workletsModuleProxy.makeShareableString(str);
  }

  makeShareableNumber(num: number) {
    return this.#workletsModuleProxy.makeShareableNumber(num);
  }

  makeShareableBoolean(bool: boolean) {
    return bool ? this.#shareableTrue : this.#shareableFalse;
  }

  makeShareableBigInt(bigInt: bigint) {
    return this.#workletsModuleProxy.makeShareableBigInt(bigInt);
  }

  makeShareableArray(array: unknown[], shouldRetainRemote: boolean) {
    return this.#workletsModuleProxy.makeShareableArray(
      array,
      shouldRetainRemote
    );
  }

  makeShareableObject<T extends object>(
    obj: T,
    shouldRetainRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T> {
    return this.#workletsModuleProxy.makeShareableObject(
      obj,
      shouldRetainRemote,
      nativeStateSource
    );
  }

  makeShareableHostObject<T extends object>(hostObject: T): ShareableRef<T> {
    return this.#workletsModuleProxy.makeShareableHostObject(
      hostObject as object
    ) as ShareableRef<T>;
  }

  makeShareableInitializer(initializer: object): ShareableRef<object> {
    return this.#workletsModuleProxy.makeShareableInitializer(initializer);
  }

  makeShareableUndefined() {
    return this.#shareableUndefined;
  }

  makeShareableNull() {
    return this.#shareableNull;
  }

  scheduleOnUI<TValue>(shareable: ShareableRef<TValue>) {
    return this.#workletsModuleProxy.scheduleOnUI(shareable);
  }

  executeOnUIRuntimeSync<TValue, TReturn>(
    shareable: ShareableRef<TValue>
  ): TReturn {
    return this.#workletsModuleProxy.executeOnUIRuntimeSync(shareable);
  }

  createWorkletRuntime(name: string, initializer: ShareableRef<() => void>) {
    return this.#workletsModuleProxy.createWorkletRuntime(name, initializer);
  }

  scheduleOnRuntime<T>(
    workletRuntime: WorkletRuntime,
    shareableWorklet: ShareableRef<T>
  ) {
    return this.#workletsModuleProxy.scheduleOnRuntime(
      workletRuntime,
      shareableWorklet
    );
  }
}
