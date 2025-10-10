'use strict';

import { init } from './initializers';

init();

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
} from './runtimes';
export {
  createSerializable,
  isSerializableRef,
  serializableMappingCache,
  type SerializableRef,
} from './serializable';
export {
  createSynchronizable,
  isSynchronizable,
  type Synchronizable,
  type SynchronizableRef,
} from './synchronizable';
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
} from './threads';
export type {
  WorkletFunction,
  WorkletRuntime,
  WorkletStackDetails,
} from './types';
export { isWorkletFunction } from './workletFunction';
export {
  type IWorkletsModule,
  WorkletsModule,
  type WorkletsModuleProxy,
} from './WorkletsModule';
