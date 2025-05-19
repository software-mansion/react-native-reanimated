/* eslint-disable reanimated/use-reanimated-error */
/* eslint-disable @typescript-eslint/unbound-method */
'use strict';

import { WorkletsTurboModule } from "../specs/index.js";
import { getValueUnpackerCode } from "../valueUnpacker.js";
import { WorkletsError } from "../WorkletsError.js";
export function createNativeWorkletsModule() {
  return new NativeWorklets();
}
class NativeWorklets {
  #workletsModuleProxy;
  constructor() {
    if (global.__workletsModuleProxy === undefined) {
      const valueUnpackerCode = getValueUnpackerCode();
      WorkletsTurboModule?.installTurboModule(valueUnpackerCode);
    }
    if (global.__workletsModuleProxy === undefined) {
      throw new WorkletsError(`Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`);
    }
    this.#workletsModuleProxy = {
      scheduleOnUI: global.__workletsModuleProxy.scheduleOnUI,
      scheduleOnRuntime: global.__workletsModuleProxy.scheduleOnRuntime,
      executeOnUIRuntimeSync: global.__workletsModuleProxy.executeOnUIRuntimeSync,
      createWorkletRuntime: global.__workletsModuleProxy.createWorkletRuntime,
      makeShareableClone: global.__workletsModuleProxy.makeShareableClone
    };
  }
  makeShareableClone(value, shouldPersistRemote, nativeStateSource) {
    return this.#workletsModuleProxy.makeShareableClone(value, shouldPersistRemote, nativeStateSource);
  }
  scheduleOnUI(shareable) {
    return this.#workletsModuleProxy.scheduleOnUI(shareable);
  }
  executeOnUIRuntimeSync(shareable) {
    return this.#workletsModuleProxy.executeOnUIRuntimeSync(shareable);
  }
  createWorkletRuntime(name, initializer) {
    return this.#workletsModuleProxy.createWorkletRuntime(name, initializer);
  }
  scheduleOnRuntime(workletRuntime, shareableWorklet) {
    return this.#workletsModuleProxy.scheduleOnRuntime(workletRuntime, shareableWorklet);
  }
}
//# sourceMappingURL=NativeWorklets.js.map