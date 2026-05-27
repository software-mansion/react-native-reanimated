'use strict';

import { getStaticFeatureFlag } from './featureFlags/featureFlags';
import { addNoBundleModeGuardImplementation } from './guardImplementation';
import {
  createSerializable,
  makeShareableCloneOnUIRecursive,
} from './memory/serializable';
import type { RemoteFunction, SerializableRef } from './memory/types';
import { RuntimeKind } from './runtimeKind';
import type { WorkletFunction, WorkletImport } from './types';
import { isWorkletFunction } from './workletFunction';
import { WorkletsModule } from './WorkletsModule/NativeWorklets';

const SHOULD_CAPTURE_SCHEDULE_STACK =
  __DEV__ && getStaticFeatureFlag('ENABLE_CROSS_RUNTIME_STACK_TRACES');

type UIJob<Args extends unknown[] = unknown[], ReturnValue = unknown> = [
  worklet: WorkletFunction<Args, ReturnValue>,
  args: Args,
  resolve: ((value: ReturnValue) => void) | undefined,
  reject: ((reason: unknown) => void) | undefined,
  scheduleStack: string | undefined,
];

let runOnUIQueue: UIJob[] = [];

export function setupMicrotasks() {
  'worklet';

  let microtasksQueue: Array<() => void> = [];
  let isExecutingMicrotasksQueue = false;
  globalThis.queueMicrotask = (callback: () => void) => {
    microtasksQueue.push(callback);
  };
  // TODO: Remove it after support for Reanimated 4.3 is dropped.
  globalThis._microtaskQueueFinalizers = [];

  globalThis.__callMicrotasks = () => {
    if (isExecutingMicrotasksQueue) {
      return;
    }
    try {
      isExecutingMicrotasksQueue = true;
      for (let index = 0; index < microtasksQueue.length; index += 1) {
        // we use classic 'for' loop because the size of the currentTasks array may change while executing some of the callbacks due to queueMicrotask calls
        microtasksQueue[index]();
      }
      microtasksQueue = [];
      globalThis._microtaskQueueFinalizers.forEach((finalizer) => finalizer());
    } finally {
      isExecutingMicrotasksQueue = false;
    }
  };
}

/**
 * Lets you schedule a function to be executed on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 *
 * - The callback executes asynchronously and doesn't return a value.
 * - Passed function and args are automatically
 *   [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 *   and serialized.
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime)
 *   or a [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime),
 *   unless you have the [Bundle Mode](/docs/bundleMode/) enabled.
 *
 * @param fun - A reference to a function you want to schedule on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 * @param args - Arguments to pass to the function.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function scheduleOnUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): void;

export function scheduleOnUI<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>,
  ...args: Args
): void {
  if (
    __DEV__ &&
    !isWorkletFunction(worklet) &&
    !(worklet as unknown as WorkletImport).__bundleData
  ) {
    throw new Error(
      '[Worklets] `scheduleOnUI` can only be used with worklets.'
    );
  }
  if (__DEV__) {
    // in DEV mode we call serializable conversion here because in case the object
    // can't be converted, we will get a meaningful stack-trace as opposed to the
    // situation when conversion is only done via microtask queue. This does not
    // make the app particularily less efficient as converted objects are cached
    // and for a given worklet the conversion only happens once.
    createSerializable(worklet);
    createSerializable(args);
  }

  enqueueUI(worklet, args);
}

/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * thread](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI/).
 *
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   thread](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI/)
 *   from the [JavaScript
 *   thread](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI/).
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI @deprecated Use `scheduleOnUI` instead.
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function runOnUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => void;

export function runOnUI<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  if (
    __DEV__ &&
    !isWorkletFunction(worklet) &&
    !(worklet as unknown as WorkletImport).__bundleData
  ) {
    throw new Error('[Worklets] `runOnUI` can only be used with worklets.');
  }
  return (...args: Args) => {
    scheduleOnUI(worklet, ...args);
  };
}

/**
 * Lets you run a function synchronously on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime)
 * from the [RN
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#rn-runtime).
 * Passed function and args are automatically
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * and serialized.
 *
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 * - This function cannot be called from a [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime).
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 * @param args - Arguments to pass to the function.
 * @returns The return value of the function passed as the first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUISync
 */
// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function runOnUISync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue;

export function runOnUISync<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>,
  ...args: Args
): ReturnValue {
  return WorkletsModule.runOnUISync(
    createSerializable(() => {
      'worklet';
      const result = worklet(...args);
      return makeShareableCloneOnUIRecursive(result);
    }),
    SHOULD_CAPTURE_SCHEDULE_STACK ? (new Error().stack ?? '') : undefined
  );
}

// @ts-expect-error This overload is correct since it's what user sees in their code
// before it's transformed by Worklets Babel plugin.
export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => ReturnValue;

export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => ReturnValue {
  return (...args) => {
    return runOnUISync(worklet, ...args);
  };
}

function runWorkletOnJS<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>,
  ...args: Args
): void {
  // remote function that calls a worklet synchronously on the JS runtime
  worklet(...args);
}

/**
 * Lets you schedule a function to be executed on the RN runtime from any
 * runtime. Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * Scheduling function from the RN Runtime (we are already on RN Runtime) simply
 * uses `queueMicrotask`.
 *
 * When functions need to be scheduled from the UI Runtime, first function and
 * args are serialized and then the system passes the scheduling responsibility
 * to the JSScheduler. The JSScheduler then uses the RN CallInvoker to schedule
 * the function asynchronously on the JavaScript thread by calling
 * `jsCallInvoker_->invokeAsync()`.
 *
 * When called from a Worker Runtime, it uses the same JSScheduler mechanism.
 *
 * @param fun - A function you want to schedule on the RN runtime. A function
 *   can be a worklet, a remote function or a regular function.
 * @param args - Arguments to pass to the function.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN
 */
export function scheduleOnRN<Args extends unknown[], ReturnValue>(
  fun:
    | ((...args: Args) => ReturnValue)
    | RemoteFunction
    | WorkletFunction<Args, ReturnValue>,
  ...args: Args
): void {
  'worklet';
  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    // if we are already on the JS thread, we just schedule the worklet on the JS queue
    queueMicrotask(
      args.length
        ? () => (fun as (...args: Args) => ReturnValue)(...args)
        : (fun as () => ReturnValue)
    );
  } else if (isWorkletFunction<Args, ReturnValue>(fun)) {
    // If `fun` is a worklet, we schedule a call of a remote function `runWorkletOnJS`
    // and pass the worklet as a first argument followed by original arguments.
    scheduleOnRN(runWorkletOnJS<Args, ReturnValue>, fun, ...args);
  } else {
    globalThis.__workletsModuleProxy.scheduleOnRN(
      fun,
      (args.length > 0
        ? globalThis.__serializer(args)
        : undefined) as SerializableRef<Args>
    );
  }
}

/**
 * Lets you asynchronously run
 * non-[workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions that couldn't otherwise run on the [UI
 * thread](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-thread).
 * This applies to most external libraries as they don't have their functions
 * marked with "worklet"; directive.
 *
 * @param fun - A reference to a function you want to execute on the JavaScript
 *   thread from the UI thread.
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnJS
 */
/** @deprecated Use `scheduleOnRN` instead. */
export function runOnJS<Args extends unknown[], ReturnValue>(
  fun:
    | ((...args: Args) => ReturnValue)
    | RemoteFunction
    | WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  return (...args: Args) => {
    scheduleOnRN(fun, ...args);
  };
}

/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 *
 * - This method does not schedule the work immediately but instead waits for
 *   other worklets to be scheduled within the same JS loop. It uses
 *   queueMicrotask to schedule all the worklets at once making sure they will
 *   run within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 *   from the [JavaScript
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#javascript-runtime).
 * @returns A promise that resolves to the return value of the function passed
 *   as the first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUIAsync
 */
export function runOnUIAsync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue,
  ...args: Args
): Promise<ReturnValue> {
  if (__DEV__) {
    if (!isWorkletFunction(worklet)) {
      throw new Error(
        '[Worklets] `runOnUIAsync` can only be used with worklets.'
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

    enqueueUI(
      worklet as WorkletFunction<Args, ReturnValue>,
      args,
      resolve,
      reject
    );
  });
}

function enqueueUI<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>,
  args: Args,
  resolve?: (value: ReturnValue) => void,
  reject?: (reason: unknown) => void
): void {
  const scheduleStack = SHOULD_CAPTURE_SCHEDULE_STACK
    ? new Error().stack
    : undefined;
  const job = [worklet, args, resolve, reject, scheduleStack] as UIJob<
    Args,
    ReturnValue
  >;
  runOnUIQueue.push(job as unknown as UIJob);
  if (runOnUIQueue.length === 1) {
    flushUIQueue();
  }
}

function flushUIQueue(): void {
  queueMicrotask(() => {
    const queue = runOnUIQueue;
    runOnUIQueue = [];
    const jobWorklets = queue.map(
      ([workletFunction, workletArgs, resolve, reject]) =>
        createSerializable(() => {
          'worklet';
          try {
            const result = workletFunction(...workletArgs);
            if (resolve) {
              const serializedResult = globalThis.__serializer(result);
              globalThis.__workletsModuleProxy.handlePromise(
                resolve,
                serializedResult
              );
            }
          } catch (error) {
            if (reject) {
              const serializedError = globalThis.__serializer(error);
              globalThis.__workletsModuleProxy.handlePromise(
                reject,
                serializedError
              );
            } else {
              throw error;
            }
          }
        })
    );
    const scheduleStacks = SHOULD_CAPTURE_SCHEDULE_STACK
      ? (queue.map(([, , , , scheduleStack]) => scheduleStack) as string[])
      : undefined;
    WorkletsModule.scheduleOnUI(
      WorkletsModule.createSerializableArray(jobWorklets),
      scheduleStacks
    );
  });
}

if (__DEV__ && !globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
  /**
   * QoL guards to give a meaningful error message when the user tries to call
   * these functions on Worklet Runtimes outside of the Bundle Mode.
   */
  addNoBundleModeGuardImplementation(runOnUIAsync);
  addNoBundleModeGuardImplementation(runOnUISync);
  addNoBundleModeGuardImplementation(scheduleOnUI);
}
