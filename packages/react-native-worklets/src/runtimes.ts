'use strict';

import { setupCallGuard } from './callGuard';
import { getMemorySafeCapturableConsole, setupConsole } from './initializers';
import { SHOULD_BE_USE_WEB } from './PlatformChecker';
import { RuntimeKind } from './runtimeKind';
import {
  createSerializable,
  makeShareableCloneOnUIRecursive,
} from './serializable';
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
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/
 */
// @ts-expect-error Public API overload.
export function createWorkletRuntime(
  config?: WorkletRuntimeConfig
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
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/
 */
export function createWorkletRuntime(
  name?: string,
  initializer?: () => void
): WorkletRuntime;

export function createWorkletRuntime(
  nameOrConfig?: string | WorkletRuntimeConfigInternal,
  initializer?: WorkletFunction<[], void>
): WorkletRuntime {
  const runtimeBoundCapturableConsole = getMemorySafeCapturableConsole();

  let name: string;
  let initializerFn: (() => void) | undefined;
  let useDefaultQueue = true;
  let customQueue: object | undefined;
  if (typeof nameOrConfig === 'string') {
    name = nameOrConfig;
    initializerFn = initializer;
  } else {
    // TODO: Make anonymous name globally unique.
    name = nameOrConfig?.name ?? 'anonymous';
    initializerFn = nameOrConfig?.initializer;
    useDefaultQueue = nameOrConfig?.useDefaultQueue ?? true;
    customQueue = nameOrConfig?.customQueue;
  }

  if (initializerFn && !isWorkletFunction(initializerFn)) {
    throw new WorkletsError(
      'The initializer passed to `createWorkletRuntime` is not a worklet.'
    );
  }

  return WorkletsModule.createWorkletRuntime(
    name,
    createSerializable(() => {
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

/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions on the [Worker
 * Runtime](/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime).
 *
 * Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * - The worklet is automatically
 *   [workletized](/docs/fundamentals/glossary#to-workletize) and ready to be
 *   run on the [Worker
 *   Runtime](/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime).
 * - The worklet is scheduled on the Worker Runtime's [Async
 *   Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/Tools/AsyncQueueImpl.cpp)
 *
 * @param workletRuntime - The runtime to schedule the worklet on.
 * @param worklet - The worklet to schedule.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export function scheduleOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void {
  'worklet';
  runOnRuntime(workletRuntime, worklet)(...args);
}

/** @deprecated Use `scheduleOnRuntime` instead. */
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
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    return (...args) =>
      globalThis._scheduleOnRuntime(
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
      createSerializable(() => {
        'worklet';
        worklet(...args);
      })
    );
}

/** Configuration object for creating a worklet runtime. */
export type WorkletRuntimeConfig = {
  /** The name of the worklet runtime. */
  name?: string;
  /**
   * A worklet that will be run immediately after the runtime is created and
   * before any other worklets.
   */
  initializer?: () => void;
} & (
  | {
      /**
       * If true, the runtime will use the default queue implementation for
       * scheduling worklets. Defaults to true.
       */
      useDefaultQueue?: true;
      /**
       * An optional custom queue to be used for scheduling worklets.
       *
       * The queue has to implement the C++ `AsyncQueue` interface from
       * `<worklets/Public/AsyncQueue.h>`.
       */
      customQueue?: never;
    }
  | {
      /**
       * If true, the runtime will use the default queue implementation for
       * scheduling worklets. Defaults to true.
       */
      useDefaultQueue: false;
      /**
       * An optional custom queue to be used for scheduling worklets.
       *
       * The queue has to implement the C++ `AsyncQueue` interface from
       * `<worklets/Public/AsyncQueue.h>`.
       */
      customQueue?: object;
    }
);

type WorkletRuntimeConfigInternal = WorkletRuntimeConfig & {
  initializer?: WorkletFunction<[], void>;
};
