'use strict';
import { checkCppVersion } from '../../platform-specific/checkCppVersion';
import { getValueUnpackerCode } from '../../valueUnpacker';
import WorkletsModule from '../specs/NativeWorkletsModule';
import { ReanimatedError } from '../../errors';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface NativeWorkletsModule {}

export class NativeWorklets {
  #nativeWorkletsModule: NativeWorkletsModule;

  constructor() {
    if (global.__workletsModuleProxy === undefined) {
      const valueUnpackerCode = getValueUnpackerCode();
      WorkletsModule?.installTurboModule(valueUnpackerCode);
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new ReanimatedError(
        `Native part of Reanimated doesn't seem to be initialized (Worklets).
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    if (__DEV__) {
      checkCppVersion();
    }
    this.#nativeWorkletsModule = global.__workletsModuleProxy;
  }
}
