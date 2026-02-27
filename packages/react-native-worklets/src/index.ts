'use strict';

import { init } from './initializers/initializers';
import { bundleModeInit } from './initializers/workletRuntimeEntry';

// is-tree-shakable-suppress
init();

// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Bundle mode.
  bundleModeInit();
}

export {
  callMicrotasks,
  isShareableRef,
  makeShareable,
  type MakeShareableClone,
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
  shareableMappingCache,
  type ShareableRef,
} from './deprecated';
export {
  getDynamicFeatureFlag,
  getStaticFeatureFlag,
  setDynamicFeatureFlag,
} from './featureFlags/featureFlags';
export { isShareable } from './memory/isShareable';
export { isSynchronizable } from './memory/isSynchronizable';
export {
  createSerializable,
  isSerializableRef,
  registerCustomSerializable,
} from './memory/serializable';
export { serializableMappingCache } from './memory/serializableMappingCache';
export { createShareable } from './memory/shareable';
export { createSynchronizable } from './memory/synchronizable';
export type {
  PureShareableGuest,
  PureShareableHost,
  RegistrationData,
  SerializableRef,
  Shareable,
  ShareableGuest,
  ShareableGuestDecorator,
  ShareableHost,
  ShareableHostDecorator,
  Synchronizable,
  SynchronizableRef,
} from './memory/types';
export {
  getRuntimeKind,
  isRNRuntime,
  isUIRuntime,
  isWorkerRuntime,
  isWorkletRuntime,
  RuntimeKind,
} from './runtimeKind';
export {
  createWorkletRuntime,
  getUIRuntimeHolder,
  getUISchedulerHolder,
  runOnRuntime,
  runOnRuntimeAsync,
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  UIRuntimeId,
} from './runtimes';
export {
  executeOnUIRuntimeSync,
  runOnJS,
  runOnUI,
  runOnUIAsync,
  runOnUISync,
  scheduleOnRN,
  scheduleOnUI,
} from './threads';
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
