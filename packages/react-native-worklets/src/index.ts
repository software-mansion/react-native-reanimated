'use strict';

import { initializeUIRuntime } from './initializers';
import { valueUnpacker } from './bundleUnpacker';
import { WorkletsModule } from './WorkletsModule';
import type { ValueUnpacker } from './workletTypes';
import { initializeLibraryOnWorkletRuntime } from './bundleBreaker';

// TODO: Specify the initialization pipeline since now there's no
// universal source of truth for it.
if (!globalThis._WORKLET) {
  globalThis.__valueUnpacker = valueUnpacker as ValueUnpacker;
  initializeUIRuntime(WorkletsModule);
} else if (false) {
    initializeLibraryOnWorkletRuntime();
}

export type { LoggerConfig } from './logger';
export {
  logger,
  LogLevel,
  registerLoggerConfig,
  updateLoggerConfig,
} from './logger';
export { createWorkletRuntime, runOnRuntime } from './runtimes';
export { shareableMappingCache } from './shareableMappingCache';
export { makeShareable, makeShareableCloneRecursive } from './shareables';
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
