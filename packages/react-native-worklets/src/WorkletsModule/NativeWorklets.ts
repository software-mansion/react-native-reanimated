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

class NativeWorklets implements IWorkletsModule {
  #workletsModuleProxy: WorkletsModuleProxy;

  constructor() {
    if (global.__workletsModuleProxy === undefined && WorkletsTurboModule) {
      const valueUnpackerCode = getValueUnpackerCode();
      if (!WorkletsTurboModule?.installTurboModule(valueUnpackerCode)) {
        // This path means that React Native has failed on reload.
        // We don't want to throw any errors to not mislead the users
        // that the problem is related to Worklets.
        // We install a DummyWorkletsModuleProxy instead.
        console.warn(
          "[Worklets] Worklets TurboModule couldn't be installed. If this happened during a multiple reload, you can ignore this message."
        );
        this.#workletsModuleProxy = new DummyWorkletsModuleProxy();
        return;
      }
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new WorkletsError(
        `Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    this.#workletsModuleProxy = global.__workletsModuleProxy;
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

class DummyWorkletsModuleProxy implements IWorkletsModule {
  makeShareableClone() {
    return null!;
  }

  scheduleOnUI() {
    return null!;
  }

  executeOnUIRuntimeSync() {
    return null!;
  }

  createWorkletRuntime() {
    return null!;
  }

  scheduleOnRuntime() {
    return null!;
  }
}
