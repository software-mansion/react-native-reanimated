import './publicGlobals';
export type { MakeShareableClone, ShareableRef } from './deprecated';
export { isShareableRef, makeShareable, makeShareableCloneOnUIRecursive, makeShareableCloneRecursive, shareableMappingCache, } from './deprecated';
export { getStaticFeatureFlag, setDynamicFeatureFlag } from './featureFlags';
export { isSynchronizable } from './isSynchronizable';
export { getRuntimeKind, RuntimeKind } from './runtimeKind';
export { createWorkletRuntime, runOnRuntime, scheduleOnRuntime, } from './runtimes';
export { createSerializable, isSerializableRef } from './serializable';
export { serializableMappingCache } from './serializableMappingCache';
export type { Synchronizable } from './synchronizable';
export { createSynchronizable } from './synchronizable';
export { callMicrotasks, executeOnUIRuntimeSync, runOnJS, runOnUI, runOnUIAsync, runOnUISync, scheduleOnRN, scheduleOnUI, unstable_eventLoopTask, } from './threads';
export { isWorkletFunction } from './workletFunction';
export type { IWorkletsModule, WorkletsModuleProxy } from './WorkletsModule';
export { WorkletsModule } from './WorkletsModule';
export type { SerializableRef, WorkletFunction, WorkletRuntime, WorkletStackDetails, } from './workletTypes';
//# sourceMappingURL=index.d.ts.map