'use strict';

import { WorkletsError } from './debug/WorkletsError';
import {
  createSerializable,
  makeShareableCloneOnUIRecursive,
} from './memory/serializable';
import { serializableMappingCache } from './memory/serializableMappingCache';
import { RuntimeKind } from './runtimeKind';
import type { WorkletFunction, WorkletImport } from './types';
import { isWorkletFunction } from './workletFunction';
import { WorkletsModule } from './WorkletsModule/NativeWorklets';

type UIJob<Args extends unknown[] = unknown[], ReturnValue = unknown> = [
  worklet: WorkletFunction<Args, ReturnValue>,
  args: Args,
  resolve?: (value: ReturnValue) => void,
];

let runOnUIQueue: UIJob[] = [];

export function setupMicrotasks() {
  'worklet';

  let microtasksQueue: Array<() => void> = [];
  let isExecutingMicrotasksQueue = false;
  globalThis.queueMicrotask = (callback: () => void) => {
    microtasksQueue.push(callback);
  };
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

function callMicrotasksOnUIThread() {
  'worklet';
  globalThis.__callMicrotasks();
}

export const callMicrotasks = callMicrotasksOnUIThread;

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
 *   unless you have the [Bundle Mode](/docs/experimental/bundleMode) enabled.
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
    throw new WorkletsError('`scheduleOnUI` can only be used with worklets.');
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
    throw new WorkletsError('`runOnUI` can only be used with worklets.');
  }
  return (...args: Args) => {
    scheduleOnUI(worklet, ...args);
  };
}

if (__DEV__) {
  function runOnUIWorklet(): void {
    'worklet';
    throw new WorkletsError(
      '`runOnUI` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }

  const serializableRunOnUIWorklet = createSerializable(runOnUIWorklet);
  serializableMappingCache.set(runOnUI, serializableRunOnUIWorklet);
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
  return WorkletsModule.executeOnUIRuntimeSync(
    createSerializable(() => {
      'worklet';
      const result = worklet(...args);
      return makeShareableCloneOnUIRecursive(result);
    })
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

type ReleaseRemoteFunction<Args extends unknown[], ReturnValue> = {
  (...args: Args): ReturnValue;
};

type DevRemoteFunction<Args extends unknown[], ReturnValue> = {
  __remoteFunction: (...args: Args) => ReturnValue;
};

type RemoteFunction<Args extends unknown[], ReturnValue> =
  | ReleaseRemoteFunction<Args, ReturnValue>
  | DevRemoteFunction<Args, ReturnValue>;

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
    | RemoteFunction<Args, ReturnValue>
    | WorkletFunction<Args, ReturnValue>,
  ...args: Args
): void {
  'worklet';
  type FunDevRemote = Extract<typeof fun, DevRemoteFunction<Args, ReturnValue>>;
  if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    // if we are already on the JS thread, we just schedule the worklet on the JS queue
    queueMicrotask(
      args.length
        ? () => (fun as (...args: Args) => ReturnValue)(...args)
        : (fun as () => ReturnValue)
    );
    return;
  }
  if (isWorkletFunction<Args, ReturnValue>(fun)) {
    // If `fun` is a worklet, we schedule a call of a remote function `runWorkletOnJS`
    // and pass the worklet as a first argument followed by original arguments.
    scheduleOnRN(runWorkletOnJS<Args, ReturnValue>, fun, ...args);
    return;
  }
  if ((fun as FunDevRemote).__remoteFunction) {
    // In development mode the function provided as `fun` throws an error message
    // such that when someone accidentally calls it directly on the UI runtime, they
    // see that they should use `runOnJS` instead. To facilitate that we put the
    // reference to the original remote function in the `__remoteFunction` property.
    fun = (fun as FunDevRemote).__remoteFunction;
  }

  const scheduleOnRNImpl =
    typeof fun === 'function'
      ? globalThis._scheduleHostFunctionOnJS
      : globalThis._scheduleRemoteFunctionOnJS;

  scheduleOnRNImpl(
    fun as (...args: Args) => ReturnValue,
    args.length > 0 ? makeShareableCloneOnUIRecursive(args) : undefined
  );
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
    | RemoteFunction<Args, ReturnValue>
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
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
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
  if (__DEV__ && !isWorkletFunction(worklet)) {
    throw new WorkletsError('`runOnUIAsync` can only be used with worklets.');
  }
  return new Promise<ReturnValue>((resolve) => {
    if (__DEV__) {
      // in DEV mode we call serializable conversion here because in case the object
      // can't be converted, we will get a meaningful stack-trace as opposed to the
      // situation when conversion is only done via microtask queue. This does not
      // make the app particularily less efficient as converted objects are cached
      // and for a given worklet the conversion only happens once.
      createSerializable(worklet);
      createSerializable(args);
    }

    enqueueUI(worklet as WorkletFunction<Args, ReturnValue>, args, resolve);
  });
}

if (__DEV__) {
  function runOnUIAsyncWorklet(): void {
    'worklet';
    throw new WorkletsError(
      '`runOnUIAsync` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }

  const serializableRunOnUIAsyncWorklet =
    createSerializable(runOnUIAsyncWorklet);
  serializableMappingCache.set(runOnUIAsync, serializableRunOnUIAsyncWorklet);
}

function enqueueUI<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>,
  args: Args,
  resolve?: (value: ReturnValue) => void
): void {
  const job = [worklet, args, resolve] as UIJob<Args, ReturnValue>;
  runOnUIQueue.push(job as unknown as UIJob);
  if (runOnUIQueue.length === 1) {
    flushUIQueue();
  }
}

function flushUIQueue(): void {
  queueMicrotask(() => {
    const queue = runOnUIQueue;
    runOnUIQueue = [];
    WorkletsModule.scheduleOnUI(
      createSerializable(() => {
        'worklet';
        queue.forEach(([workletFunction, workletArgs, jobResolve]) => {
          const result = workletFunction(...workletArgs);
          if (jobResolve) {
            runOnJS(jobResolve)(result);
          }
        });
        callMicrotasks();
      })
    );
  });
}

/**
 * Added temporarily for integration with `react-native-audio-api`. Don't depend
 * on this API as it may change without notice.
 */
// eslint-disable-next-line camelcase
export function unstable_eventLoopTask<TArgs extends unknown[], TRet>(
  worklet: (...args: TArgs) => TRet
) {
  return (...args: TArgs) => {
    'worklet';
    worklet(...args);
    callMicrotasks();
  };
}
