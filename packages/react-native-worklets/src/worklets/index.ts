'use strict';

import { initializeUIRuntime } from './initializers';
import { WorkletsModule } from './WorkletsModule';

initializeUIRuntime(WorkletsModule);

export {
  createCustomError,
  registerCustomError,
  registerWorkletStackDetails,
  reportFatalErrorOnJS,
} from './errors';
export type { CustomError } from './errors';
export {
  logger,
  LogLevel,
  registerLoggerConfig,
  updateLoggerConfig,
} from './logger';
export type { LoggerConfig } from './logger';
export { mockedRequestAnimationFrame } from './mockedRequestAnimationFrame';
export { shareableMappingCache } from './shareableMappingCache';
export {
  makeShareable,
  makeShareableCloneRecursive,
  makeShareableCloneOnUIRecursive,
} from './shareables';
export {
  callMicrotasks,
  executeOnUIRuntimeSync,
  runOnJS,
  runOnUI,
  runOnUIImmediately,
} from './threads';
export { isWorkletFunction } from './workletFunction';
export { WorkletsModule } from './WorkletsModule';
export type { IWorkletsModule, WorkletsModuleProxy } from './WorkletsModule';
export type {
  ShareableRef,
  WorkletFunction,
  WorkletFunctionDev,
  WorkletRuntime,
  WorkletStackDetails,
} from './workletTypes';
export { setupCallGuard, setupConsole } from './initializers';
