'use strict';
import type { IWorkletsModule } from '../../commonTypes';
import { ReanimatedError } from '../../errors';
import { WorkletsTurboModule } from '../../specs';
import { getValueUnpackerCode } from '../valueUnpacker';
import type { WorkletsModuleProxy } from './workletsModuleProxy';

export function createNativeWorkletsModule(): IWorkletsModule {
  return new NativeWorklets();
}

class NativeWorklets {
  #workletsModuleProxy: WorkletsModuleProxy;

  constructor() {
    if (global.__workletsModuleProxy === undefined) {
      const valueUnpackerCode = getValueUnpackerCode();
      WorkletsTurboModule?.installTurboModule(valueUnpackerCode);
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new ReanimatedError(
        `Native part of Reanimated doesn't seem to be initialized (Worklets).
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    this.#workletsModuleProxy = global.__workletsModuleProxy;
  }

  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ) {
    return this.#workletsModuleProxy.makeShareableClone(
      value,
      shouldPersistRemote,
      nativeStateSource
    );
  }
}
