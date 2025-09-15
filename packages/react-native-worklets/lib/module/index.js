'use strict';

import './publicGlobals';
import { init } from './initializers';
import { bundleModeInit } from './workletRuntimeEntry';
init();
export { isShareableRef, makeShareable, makeShareableCloneOnUIRecursive, makeShareableCloneRecursive, shareableMappingCache } from './deprecated';
export { getStaticFeatureFlag, setDynamicFeatureFlag } from './featureFlags';
export { isSynchronizable } from './isSynchronizable';
export { getRuntimeKind, RuntimeKind } from './runtimeKind';
export { createWorkletRuntime, runOnRuntime, scheduleOnRuntime } from './runtimes';
export { createSerializable, isSerializableRef } from './serializable';
export { serializableMappingCache } from './serializableMappingCache';
export { createSynchronizable } from './synchronizable';
export { callMicrotasks, executeOnUIRuntimeSync, runOnJS, runOnUI, runOnUIAsync, runOnUISync, scheduleOnRN, scheduleOnUI,
// eslint-disable-next-line camelcase
unstable_eventLoopTask } from './threads';
export { isWorkletFunction } from './workletFunction';
export { WorkletsModule } from './WorkletsModule';
// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Bundle mode.
  bundleModeInit();
}
//# sourceMappingURL=index.js.map