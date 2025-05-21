'use strict';

import { setupCallGuard, setupConsole } from './initializers';
import { registerLoggerConfig } from './logger';
import { shouldBeUseWeb } from './PlatformChecker';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';
import { isWorkletFunction } from './workletFunction';
import { registerWorkletsError, WorkletsError } from './WorkletsError';
import { WorkletsModule } from './WorkletsModule';
import type { WorkletFunction, WorkletRuntime } from './workletTypes';

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
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
export function createWorkletRuntime(
  name: string,
  initializer?: () => void
): WorkletRuntime;

export function createWorkletRuntime(
  name: string,
  initializer?: WorkletFunction<[], void>
): WorkletRuntime {
  // Assign to a different variable as __workletsLoggerConfig is not a captured
  // identifier in the Worklet runtime.
  const config = __workletsLoggerConfig;
  return WorkletsModule.createWorkletRuntime(
    name,
    makeShareableCloneRecursive(() => {
      'worklet';
      registerWorkletsError();
      registerLoggerConfig(config);
      setupCallGuard();
      setupConsole();
      initializer?.();
    })
  );
}

// @ts-expect-error Check `runOnUI` overload.
export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;
/** Schedule a worklet to execute on the background queue. */
export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
    throw new WorkletsError(
      'The function passed to `runOnRuntime` is not a worklet.'
    );
  }
  if (globalThis._WORKLET) {
    return (...args) =>
      global._scheduleOnRuntime(
        workletRuntime,
        makeShareableCloneOnUIRecursive(() => {
          'worklet';
          worklet(...args);
        })
      );
  }
  return (...args) =>
    WorkletsModule.scheduleOnRuntime(
      workletRuntime,
      makeShareableCloneRecursive(() => {
        'worklet';
        worklet(...args);
      })
    );
}
