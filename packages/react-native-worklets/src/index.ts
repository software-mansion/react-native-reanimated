'use strict';

import { init } from './initializers';
import { experimentalBundlingInit } from './workletRuntimeEntry';

init();

export {
  makeShareable,
  makeSerializable,
  makeSerializable,
  serializableMappingCache,
} from './memory';
export { createWorkletRuntime, runOnRuntime } from './runtimes';
export {
  callMicrotasks,
  executeOnUIRuntimeSync,
  runOnJS,
  runOnUI,
  runOnUIAsync,
} from './threads';
export { isWorkletFunction } from './workletFunction';
export type { IWorkletsModule, WorkletsModuleProxy } from './WorkletsModule';
export { WorkletsModule } from './WorkletsModule';
export type {
  ShareableRef,
  WorkletFunction,
  WorkletRuntime,
  WorkletStackDetails,
} from './workletTypes';

// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Experimental bundling.
  experimentalBundlingInit();
}
