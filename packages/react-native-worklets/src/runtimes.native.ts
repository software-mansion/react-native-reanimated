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
import { serializableMappingCache } from './memory/serializableMappingCache';
import { setupRunLoop } from './runLoop/workletRuntime';
import { RuntimeKind } from './runtimeKind';
import { scheduleOnRN } from './threads';
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
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/) is
 *   enabled.
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
  const proxy = globalThis.__workletsModuleProxy;
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    proxy.scheduleOnRuntime(
      workletRuntime,
      makeShareableCloneOnUIRecursive(() => {
        'worklet';
        worklet(...args);
        globalThis.__flushMicrotasks?.();
      })
    );
  } else {
    proxy.scheduleOnRuntime(
      workletRuntime,
      createSerializable(() => {
        'worklet';
        worklet(...args);
        globalThis.__flushMicrotasks?.();
      })
    );
  }
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
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/) is
 *   enabled.
 *
 * @param runtimeId - The id of the runtime to schedule the worklet on.
 * @param worklet - The worklet to schedule.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function scheduleOnRuntimeWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;

export function scheduleOnRuntimeWithId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: WorkletFunction<Args, ReturnValue>,
  ...args: Args
): void {
  'worklet';
  if (__DEV__ && !isWorkletFunction(worklet)) {
    throw new WorkletsError(
      'The function passed to `scheduleOnRuntimeWithId` is not a worklet.'
    );
  }
  const proxy = globalThis.__workletsModuleProxy;
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    proxy.scheduleOnRuntimeFromId(
      runtimeId,
      makeShareableCloneOnUIRecursive(() => {
        'worklet';
        worklet(...args);
        globalThis.__flushMicrotasks?.();
      })
    );
  } else {
    proxy.scheduleOnRuntimeFromId(
      runtimeId,
      createSerializable(() => {
        'worklet';
        worklet(...args);
        globalThis.__flushMicrotasks?.();
      })
    );
  }
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

/**
 * Lets you run a function synchronously on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime).
 *
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 *   or another [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime),
 *   unless the [Bundle
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/) is
 *   enabled.
 *
 * @param workletRuntime - The runtime to run the worklet on.
 * @param worklet - The worklet to run.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export function runOnRuntimeSync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue {
  'worklet';
  if (__DEV__ && !isWorkletFunction(worklet)) {
    throw new WorkletsError(
      'The function passed to `runOnRuntimeSync` is not a worklet.'
    );
  }

  const proxy = globalThis.__workletsModuleProxy;
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    return proxy.runOnRuntimeSync(
      workletRuntime,
      makeShareableCloneOnUIRecursive(() => {
        'worklet';
        const result = worklet(...args);
        return makeShareableCloneOnUIRecursive(result);
      })
    );
  } else {
    return proxy.runOnRuntimeSync(
      workletRuntime,
      createSerializable(() => {
        'worklet';
        const result = worklet(...args);
        return makeShareableCloneOnUIRecursive(result);
      })
    );
  }
}

/**
 * Lets you run a function synchronously on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime)
 * identified by its id.
 *
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 *   or another [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime),
 *   unless the [Bundle
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/) is
 *   enabled.
 *
 * @param runtimeId - The id of the runtime to run the worklet on.
 * @param worklet - The worklet to run.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function runOnRuntimeSyncFromId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;

export function runOnRuntimeSyncFromId<Args extends unknown[], ReturnValue>(
  runtimeId: number,
  worklet: WorkletFunction<Args, ReturnValue>,
  ...args: Args
): ReturnValue {
  'worklet';
  if (__DEV__ && !isWorkletFunction(worklet)) {
    throw new WorkletsError(
      'The function passed to `runOnRuntimeSyncFromId` is not a worklet.'
    );
  }

  const proxy = globalThis.__workletsModuleProxy;
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    return proxy.runOnRuntimeSyncFromId(
      runtimeId,
      makeShareableCloneOnUIRecursive(() => {
        'worklet';
        const result = worklet(...args);
        return makeShareableCloneOnUIRecursive(result);
      })
    );
  } else {
    return proxy.runOnRuntimeSyncFromId(
      runtimeId,
      createSerializable(() => {
        'worklet';
        const result = worklet(...args);
        return makeShareableCloneOnUIRecursive(result);
      })
    );
  }
}

/**
 * Lets you asynchronously run a
 * [worklet](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet)
 * on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime)
 * and get the result via a Promise.
 *
 * - The worklet is scheduled on the Worker Runtime's Async Queue
 * - Returns a Promise that resolves with the worklet's return value
 * - This function can only be called from the [RN
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#rn-runtime).
 *
 * @param workletRuntime - The runtime to run the worklet on.
 * @param worklet - The worklet to run.
 * @param args - The arguments to pass to the worklet.
 * @returns A Promise that resolves to the return value of the worklet.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnRuntimeAsync
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function runOnRuntimeAsync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue>;

export function runOnRuntimeAsync<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<Args, ReturnValue>,
  ...args: Args
): Promise<ReturnValue> {
  if (__DEV__) {
    if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
      throw new WorkletsError(
        '`runOnRuntimeAsync` can only be called on the RN Runtime.'
      );
    }
    if (!isWorkletFunction(worklet)) {
      throw new WorkletsError(
        'The function passed to `runOnRuntimeAsync` is not a worklet.'
      );
    }
  }

  return new Promise<ReturnValue>((resolve, reject) => {
    if (__DEV__) {
      // in DEV mode we call serializable conversion here because in case the object
      // can't be converted, we will get a meaningful stack-trace as opposed to the
      // situation when conversion is only done via microtask queue. This does not
      // make the app particularily less efficient as converted objects are cached
      // and for a given worklet the conversion only happens once.
      createSerializable(worklet);
      createSerializable(args);
    }

    WorkletsModule.scheduleOnRuntime(
      workletRuntime,
      createSerializable(() => {
        'worklet';
        try {
          const result = worklet(...args);
          scheduleOnRN(resolve, result);
        } catch (error) {
          scheduleOnRN(reject, error);
        }
        globalThis?.__flushMicrotasks?.();
      })
    );
  });
}

if (__DEV__) {
  function runOnRuntimeAsyncWorklet(): void {
    'worklet';
    throw new WorkletsError(
      '`runOnRuntimeAsync` can only be called on the RN Runtime.'
    );
  }

  const serializableRunOnRuntimeAsyncWorklet = createSerializable(
    runOnRuntimeAsyncWorklet
  );
  serializableMappingCache.set(
    runOnRuntimeAsync,
    serializableRunOnRuntimeAsyncWorklet
  );
}
