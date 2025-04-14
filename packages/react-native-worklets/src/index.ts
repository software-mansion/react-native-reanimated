'use strict';

import { breakBundle } from './bundleBreaker';
import { initializeUIRuntime } from './initializers';
import { initializeWorkletRegistries } from './workletRegistry';
import { WorkletsModule } from './WorkletsModule';

// TODO: Specify the initialization pipeline since now there's no
// universal source of truth for it.
initializeWorkletRegistries();
initializeUIRuntime(WorkletsModule);
breakBundle();

export type { CustomError } from './errors';
export { createCustomError, registerCustomError } from './errors';
export type { LoggerConfig } from './logger';
export {
  logger,
  LogLevel,
  registerLoggerConfig,
  updateLoggerConfig,
} from './logger';
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
