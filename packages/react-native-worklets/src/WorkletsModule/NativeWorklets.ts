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
    this.#workletsModuleProxy = global.__workletsModuleProxy;
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

  makeShareableImport<TValue>(from: string, to: string): ShareableRef<TValue> {
    return this.#workletsModuleProxy.makeShareableImport(from, to);
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

  makeShareableUndefined() {
    return this.#shareableUndefined;
  }

  makeShareableNull() {
    return this.#shareableNull;
  }

  makeShareableHostObject<T extends object>(obj: T) {
    return this.#workletsModuleProxy.makeShareableHostObject(obj);
  }

  makeShareableArray(array: unknown[], shouldRetainRemote: boolean) {
    return this.#workletsModuleProxy.makeShareableArray(
      array,
      shouldRetainRemote
    );
  }

  makeShareableInitializer(obj: object) {
    return this.#workletsModuleProxy.makeShareableInitializer(obj);
  }

  makeShareableFunction(func: object) {
    return this.#workletsModuleProxy.makeShareableFunction(func);
  }
  
  makeShareableWorklet(worklet: object, shouldPersistRemote: boolean) {
    return this.#workletsModuleProxy.makeShareableWorklet(
      worklet,
      shouldPersistRemote
    );
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
