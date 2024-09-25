'use strict';
import { getValueUnpackerCode } from '../valueUnpacker';
import { WorkletsTurboModule } from '../../specs';
import { ReanimatedError } from '../../errors';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {}

export class NativeWorklets {
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
}
