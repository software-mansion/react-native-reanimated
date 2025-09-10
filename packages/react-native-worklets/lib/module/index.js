'use strict';

import "./publicGlobals.js";
import { init } from "./initializers.js";
import { bundleModeInit } from "./workletRuntimeEntry.js";
init();
export { isShareableRef, makeShareable, makeShareableCloneOnUIRecursive, makeShareableCloneRecursive, shareableMappingCache } from "./deprecated.js";
export { getStaticFeatureFlag, setDynamicFeatureFlag } from "./featureFlags/index.js";
export { isSynchronizable } from "./isSynchronizable.js";
export { getRuntimeKind, RuntimeKind } from "./runtimeKind.js";
export { createWorkletRuntime, runOnRuntime, scheduleOnRuntime } from "./runtimes.js";
export { createSerializable, isSerializableRef } from "./serializable.js";
export { serializableMappingCache } from "./serializableMappingCache.js";
export { createSynchronizable } from "./synchronizable.js";
export { callMicrotasks, executeOnUIRuntimeSync, runOnJS, runOnUI, runOnUIAsync, runOnUISync, scheduleOnRN, scheduleOnUI,
// eslint-disable-next-line camelcase
unstable_eventLoopTask } from "./threads.js";
export { isWorkletFunction } from "./workletFunction.js";
export { WorkletsModule } from "./WorkletsModule/index.js";
// @ts-expect-error We must trick the bundler to include
// the `workletRuntimeEntry` file the way it cannot optimize it out.
if (globalThis._ALWAYS_FALSE) {
  // Bundle mode.
  bundleModeInit();
}
//# sourceMappingURL=index.js.map