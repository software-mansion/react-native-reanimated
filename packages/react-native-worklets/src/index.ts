'use strict';

import { init } from './initializers/initializers';
import { bundleModeInit } from './initializers/workletRuntimeEntry';

init();

// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Bundle mode.
  bundleModeInit();
}

export {
  isShareableRef,
  makeShareable,
  type MakeShareableClone,
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
  shareableMappingCache,
  type ShareableRef,
} from './deprecated';
export { getStaticFeatureFlag, setDynamicFeatureFlag } from './featureFlags';
export { getRuntimeKind, RuntimeKind } from './runtimeKind';
export {
  createWorkletRuntime,
  runOnRuntime,
  scheduleOnRuntime,
} from './runtimes/runtimes';
export {
  createSerializable,
  isSerializableRef,
} from './serializable/serializable';
export { serializableMappingCache } from './serializable/serializableMappingCache';
export type { SerializableRef } from './serializable/types';
export { isSynchronizable } from './synchronizable/isSynchronizable';
export { createSynchronizable } from './synchronizable/synchronizable';
export type { Synchronizable, SynchronizableRef } from './synchronizable/types';
export {
  callMicrotasks,
  executeOnUIRuntimeSync,
  runOnJS,
  runOnUI,
  runOnUIAsync,
  runOnUISync,
  scheduleOnRN,
  scheduleOnUI,
  // eslint-disable-next-line camelcase
  unstable_eventLoopTask,
} from './threads/threads';
export type {
  WorkletFunction,
  WorkletRuntime,
  WorkletStackDetails,
} from './types';
export { isWorkletFunction } from './workletFunction';
export { WorkletsModule } from './WorkletsModule/NativeWorklets';
export type {
  IWorkletsModule,
  WorkletsModuleProxy,
} from './WorkletsModule/workletsModuleProxy';
