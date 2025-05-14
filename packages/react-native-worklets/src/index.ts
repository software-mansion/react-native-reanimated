'use strict';

import { breakBundle } from './bundleBreaker';
import { initializeUIRuntime } from './initializers';
import { __valueUnpacker } from './valueUnpacker';
import { initializeWorkletRegistries } from './workletRegistry';
import { WorkletsModule } from './WorkletsModule';

// TODO: Specify the initialization pipeline since now there's no
// universal source of truth for it.
if (!globalThis._WORKLET) {
  console.log(Object.keys(globalThis));
  initializeWorkletRegistries();
  initializeUIRuntime(WorkletsModule);
  // @ts-ignore www
  globalThis.__valueUnpacker = __valueUnpacker;
  // @ts-ignore www
} else if (!globalThis._BROKEN) {
  breakBundle();
  // @ts-ignore www
  globalThis._BROKEN = true;
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
export {
  __getWorklet,
  __registerWorkletFactory,
  __registerWorkletInitData,
} from './workletRegistry';
export type { IWorkletsModule, WorkletsModuleProxy } from './WorkletsModule';
export { WorkletsModule } from './WorkletsModule';
export type {
  ShareableRef,
  WorkletFunction,
  WorkletRuntime,
  WorkletStackDetails,
} from './workletTypes';
