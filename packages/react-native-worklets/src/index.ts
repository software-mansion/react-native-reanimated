'use strict';

import { bundleValueUnpacker } from './bundleUnpacker';
import { initializeUIRuntime } from './initializers';
import { initializeLibraryOnWorkletRuntime } from './workletRuntimeEntry';
import { WorkletsModule } from './WorkletsModule';
import type { ValueUnpacker } from './workletTypes';

// TODO: Specify the initialization pipeline since now there's no
// universal source of truth for it.
if (!globalThis._WORKLET) {
  globalThis.__valueUnpacker = bundleValueUnpacker as ValueUnpacker;
  initializeUIRuntime(WorkletsModule);
  // @ts-expect-error We must trick the bundler to include
  // the `workletRuntimeEntry` file the way it cannot optimize it out.
} else if (globalThis._ALWAYS_FALSE) {
  // We must 'run' anything from `workletRuntimeEntry`
  // for it to be pulled into the bundle.
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
