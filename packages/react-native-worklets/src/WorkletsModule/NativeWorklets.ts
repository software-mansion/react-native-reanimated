/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import { WorkletsTurboModule } from '../specs';
import { getValueUnpackerCode } from '../valueUnpacker';
import { WorkletsError } from '../WorkletsError';
import type { ShareableRef, WorkletRuntime } from '../workletTypes';
import type { WorkletsModuleProxy } from './workletsModuleProxy';

export interface IWorkletsModule extends WorkletsModuleProxy {}

export function createNativeWorkletsModule(): IWorkletsModule {
  return new NativeWorklets();
}

class NativeWorklets {
  #workletsModuleProxy: WorkletsModuleProxy;
  #workletMakeShareableClone: <TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) => ShareableRef<TValue>;
  #workletScheduleOnUI: <TValue>(shareable: ShareableRef<TValue>) => void;
  #workletExecuteOnUIRuntimeSync: <TValue, TReturn>(shareable: ShareableRef<TValue>) => TReturn;
  #workletCreateWorkletRuntime: (name: string, initializer: ShareableRef<() => void>) => WorkletRuntime;
  #workletScheduleOnRuntime: <T>(workletRuntime: WorkletRuntime, shareableWorklet: ShareableRef<T>) => void;


  constructor() {
    if (global.__workletsModuleProxy === undefined) {
      const valueUnpackerCode = getValueUnpackerCode();
      WorkletsTurboModule?.installTurboModule(valueUnpackerCode);
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new WorkletsError(
        `Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    this.#workletsModuleProxy = global.__workletsModuleProxy;
    this.#workletMakeShareableClone = this.#workletsModuleProxy.makeShareableClone;
    this.#workletScheduleOnUI = this.#workletsModuleProxy.scheduleOnUI;
    this.#workletExecuteOnUIRuntimeSync = this.#workletsModuleProxy.executeOnUIRuntimeSync;
    this.#workletCreateWorkletRuntime = this.#workletsModuleProxy.createWorkletRuntime;
    this.#workletScheduleOnRuntime = this.#workletsModuleProxy.scheduleOnRuntime;
  }

  makeShareableClone<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) {
    return this.#workletMakeShareableClone(
      value,
      shouldPersistRemote,
      nativeStateSource
    );
  }

  scheduleOnUI<TValue>(shareable: ShareableRef<TValue>) {
    return this.#workletScheduleOnUI(shareable);
  }

  executeOnUIRuntimeSync<TValue, TReturn>(
    shareable: ShareableRef<TValue>
  ): TReturn {
    return this.#workletExecuteOnUIRuntimeSync(shareable);
  }

  createWorkletRuntime(name: string, initializer: ShareableRef<() => void>) {
    return this.#workletCreateWorkletRuntime(name, initializer);
  }

  scheduleOnRuntime<T>(
    workletRuntime: WorkletRuntime,
    shareableWorklet: ShareableRef<T>
  ) {
    return this.#workletScheduleOnRuntime(
      workletRuntime,
      shareableWorklet
    );
  }
}
