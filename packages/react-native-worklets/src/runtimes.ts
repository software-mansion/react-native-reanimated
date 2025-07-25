'use strict';

import { setupCallGuard } from './callGuard';
import { getMemorySafeCapturableConsole, setupConsole } from './initializers';
import { SHOULD_BE_USE_WEB } from './PlatformChecker';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';
import { isWorkletFunction } from './workletFunction';
import { registerWorkletsError, WorkletsError } from './WorkletsError';
import { WorkletsModule } from './WorkletsModule';
import type { WorkletFunction, WorkletRuntime } from './workletTypes';

/**
 * Lets you create a new JS runtime which can be used to run worklets possibly
 * on different threads than JS or UI thread.
 *
 * @param config - Runtime configuration object - {@link WorkletRuntimeConfig}.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/createWorkletRuntime
 */
// @ts-expect-error Public API overload.
export function createWorkletRuntime(
  config: WorkletRuntimeConfig
): WorkletRuntime;

/**
 * @deprecated Please use the new config object signature instead:
 *   `createWorkletRuntime({ name, initializer })`
 *
 *   Lets you create a new JS runtime which can be used to run worklets possibly
 *   on different threads than JS or UI thread.
 * @param name - A name used to identify the runtime which will appear in
 *   devices list in Chrome DevTools.
 * @param initializer - An optional worklet that will be run synchronously on
 *   the same thread immediately after the runtime is created.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/createWorkletRuntime
 */
export function createWorkletRuntime(
  name: string,
  initializer?: () => void
): WorkletRuntime;

export function createWorkletRuntime(
  nameOrConfig: string | WorkletRuntimeConfigInternal,
  initializer?: WorkletFunction<[], void>
): WorkletRuntime {
  if (initializer !== undefined && !isWorkletFunction(initializer)) {
    throw new WorkletsError(
      'The initializer passed to `createWorkletRuntime` is not a worklet.'
    );
  }
  const runtimeBoundCapturableConsole = getMemorySafeCapturableConsole();

  let name: string;
  let initializerFn: (() => void) | undefined;
  let useDefaultQueue = true;
  let customQueue: object | undefined;
  if (typeof nameOrConfig === 'string') {
    name = nameOrConfig;
    initializerFn = initializer;
  } else {
    name = nameOrConfig.name ?? 'anonymous' + performance.now().toFixed(0);
    initializerFn = nameOrConfig.initializer;
    useDefaultQueue = nameOrConfig.useDefaultQueue ?? true;
    customQueue = nameOrConfig.customQueue;
  }

  return WorkletsModule.createWorkletRuntime(
    name,
    makeShareableCloneRecursive(() => {
      'worklet';
      setupCallGuard();
      registerWorkletsError();
      setupConsole(runtimeBoundCapturableConsole);
      initializerFn?.();
    }),
    useDefaultQueue,
    customQueue
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

/** Configuration object for creating a worklet runtime. */
export interface WorkletRuntimeConfig {
  /** The name of the worklet runtime. */
  name?: string;
  /**
   * A worklet that will be run immediately after the runtime is created and
   * before any other worklets.
   */
  initializer?: () => void;
  /**
   * If true, the runtime will use the default queue implementation for
   * scheduling worklets. Defaults to true.
   */
  useDefaultQueue?: boolean;
  /**
   * An optional custom queue to be used for scheduling worklets. If provided,
   * `useDefaultQueue` will be ignored.
   *
   * The queue has to implement the C++ `AsyncQueue` interface from
   * `<worklets/Public/AsyncQueue.h>`.
   */
  customQueue?: object;
}

interface WorkletRuntimeConfigInternal extends WorkletRuntimeConfig {
  initializer?: WorkletFunction<[], void>;
}
