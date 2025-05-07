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
    };
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
