'use strict';

import { setupCallGuard } from './callGuard';
import { registerWorkletsError, WorkletsError } from './debug/WorkletsError';
import {
  getMemorySafeCapturableConsole,
  setupConsole,
  setupSerializer,
} from './initializers/initializers';
import {
  createSerializable,
  makeShareableCloneOnUIRecursive,
} from './memory/serializable';
import { setupRunLoop } from './runLoop/workletRuntime';
import { RuntimeKind } from './runtimeKind';
import type {
  WorkletFunction,
  WorkletRuntime,
  WorkletRuntimeConfig,
} from './types';
import { isWorkletFunction } from './workletFunction';
import { WorkletsModule } from './WorkletsModule/NativeWorklets';

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
  let animationQueuePollingRate: number;
  let enableEventLoop = true;
  if (typeof nameOrConfig === 'string') {
    name = nameOrConfig;
    initializerFn = initializer;
  } else {
    // TODO: Make anonymous name globally unique.
    name = nameOrConfig?.name ?? 'anonymous';
    initializerFn = nameOrConfig?.initializer;
    useDefaultQueue = nameOrConfig?.useDefaultQueue ?? true;
    customQueue = nameOrConfig?.customQueue;
    animationQueuePollingRate = Math.round(
      nameOrConfig?.animationQueuePollingRate ?? 16
    );
    enableEventLoop = nameOrConfig?.enableEventLoop ?? true;
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
      setupSerializer();
      registerWorkletsError();
      setupConsole(runtimeBoundCapturableConsole);
      if (enableEventLoop) {
        setupRunLoop(animationQueuePollingRate);
      }
      initializerFn?.();
    }),
    useDefaultQueue,
    customQueue,
    enableEventLoop
  );
}

/**
 * Lets you asynchronously run a
 * [worklet](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet)
 * on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime).
 *
 * Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * - The worklet is scheduled on the Worker Runtime's [Async
 *   Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/RunLoop/AsyncQueue.h)
 * - The function cannot be scheduled on the Worker Runtime from [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime)
 *   or another [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime),
 *   unless the [Bundle
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/experimental/bundleMode)
 *   is enabled.
 *
 * @param workletRuntime - The runtime to schedule the worklet on.
 * @param worklet - The worklet to schedule.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function scheduleOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;

export function scheduleOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<Args, ReturnValue>,
  ...args: Args
): void {
  'worklet';
  if (__DEV__ && !isWorkletFunction(worklet)) {
    throw new WorkletsError(
      'The function passed to `scheduleOnRuntime` is not a worklet.'
    );
  }
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    globalThis._scheduleOnRuntime(
      workletRuntime,
      makeShareableCloneOnUIRecursive(() => {
        'worklet';
        worklet(...args);
      })
    );
  }

  WorkletsModule.scheduleOnRuntime(
    workletRuntime,
    createSerializable(() => {
      'worklet';
      worklet(...args);
      globalThis.__flushMicrotasks();
    })
  );
}

/**
 * @deprecated Use `scheduleOnRuntime` instead.
 *
 *   Schedule a worklet to execute on the background queue.
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;

export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  if (__DEV__ && !isWorkletFunction(worklet)) {
    throw new WorkletsError(
      'The function passed to `runOnRuntime` is not a worklet.'
    );
  }
  return (...args) => scheduleOnRuntime(workletRuntime, worklet, ...args);
}

type WorkletRuntimeConfigInternal = WorkletRuntimeConfig & {
  initializer?: WorkletFunction<[], void>;
};
