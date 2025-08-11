'use strict';

import './publicGlobals';

import { init } from './initializers';
import { bundleModeInit } from './workletRuntimeEntry';

init();

export type { MakeShareableClone, ShareableRef } from './deprecated';
export {
  isShareableRef,
  makeShareable,
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
  shareableMappingCache,
} from './deprecated';
export { setDynamicFeatureFlag } from './featureFlags/dynamicFlags';
export { createWorkletRuntime, runOnRuntime } from './runtimes';
export { createSerializable, isSerializableRef } from './serializable';
export { serializableMappingCache } from './serializableMappingCache';
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
  SerializableRef,
  WorkletFunction,
  WorkletRuntime,
  WorkletStackDetails,
} from './workletTypes';

// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Bundle mode.
  bundleModeInit();
}
