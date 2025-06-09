'use strict';

import './publicGlobals';

import { initializeUIRuntime } from './initializers';
import { WorkletsModule } from './WorkletsModule';

// TODO: Specify the initialization pipeline since now there's no
// universal source of truth for it.
if (!globalThis._WORKLET) {
  // Don't call this method on Worklet Runtimes.
  initializeUIRuntime(WorkletsModule);
}

export type { LoggerConfig } from './logger';
export {
  logger,
  LogLevel,
  registerLoggerConfig,
  updateLoggerConfig,
} from './logger';
export { getRuntimeKind, RuntimeKind } from './runtimeKind';
export { createWorkletRuntime, runOnRuntime } from './runtimes';
export { shareableMappingCache } from './shareableMappingCache';
export {
  makeShareable,
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';
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
