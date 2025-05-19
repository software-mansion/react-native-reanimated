'use strict';

import { setupCallGuard, setupConsole } from "./initializers.js";
import { registerLoggerConfig } from "./logger/index.js";
import { shouldBeUseWeb } from "./PlatformChecker.js";
import { makeShareableCloneOnUIRecursive, makeShareableCloneRecursive } from "./shareables.js";
import { isWorkletFunction } from "./workletFunction.js";
import { registerWorkletsError, WorkletsError } from "./WorkletsError.js";
import { WorkletsModule } from "./WorkletsModule/index.js";
const SHOULD_BE_USE_WEB = shouldBeUseWeb();

/**
 * Lets you create a new JS runtime which can be used to run worklets possibly
 * on different threads than JS or UI thread.
 *
 * @param name - A name used to identify the runtime which will appear in
 *   devices list in Chrome DevTools.
 * @param initializer - An optional worklet that will be run synchronously on
 *   the same thread immediately after the runtime is created.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/createWorkletRuntime
 */
// @ts-expect-error Check `runOnUI` overload.

export function createWorkletRuntime(name, initializer) {
  // Assign to a different variable as __workletsLoggerConfig is not a captured
  // identifier in the Worklet runtime.
  const config = __workletsLoggerConfig;
  return WorkletsModule.createWorkletRuntime(name, makeShareableCloneRecursive(() => {
    'worklet';

    registerWorkletsError();
    registerLoggerConfig(config);
    setupCallGuard();
    setupConsole();
    initializer?.();
  }));
}

// @ts-expect-error Check `runOnUI` overload.

/** Schedule a worklet to execute on the background queue. */
export function runOnRuntime(workletRuntime, worklet) {
  'worklet';

  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
    throw new WorkletsError('The function passed to `runOnRuntime` is not a worklet.' + (globalThis._WORKLET ? ' Please make sure that `processNestedWorklets` option in Reanimated Babel plugin is enabled.' : ''));
  }
  if (globalThis._WORKLET) {
    return (...args) => global._scheduleOnRuntime(workletRuntime, makeShareableCloneOnUIRecursive(() => {
      'worklet';

      worklet(...args);
    }));
  }
  return (...args) => WorkletsModule.scheduleOnRuntime(workletRuntime, makeShareableCloneRecursive(() => {
    'worklet';

    worklet(...args);
  }));
}
//# sourceMappingURL=runtimes.js.map