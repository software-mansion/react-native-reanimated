'use strict';
import { IS_JEST, SHOULD_BE_USE_WEB } from './PlatformChecker';
import { shareableMappingCache } from './shareableMappingCache';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';
import { isWorkletFunction } from './workletFunction';
import { WorkletsError } from './WorkletsError';
import { WorkletsModule } from './WorkletsModule';
import type { WorkletFunction, WorkletImport } from './workletTypes';

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
  global.queueMicrotask = (callback: () => void) => {
    microtasksQueue.push(callback);
  };
  global._microtaskQueueFinalizers = [];

  global.__callMicrotasks = () => {
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
      global._microtaskQueueFinalizers.forEach((finalizer) => finalizer());
    } finally {
      isExecutingMicrotasksQueue = false;
    }
  };
}

function callMicrotasksOnUIThread() {
  'worklet';
  global.__callMicrotasks();
}

export const callMicrotasks = SHOULD_BE_USE_WEB
  ? () => {
      // on web flushing is a noop as immediates are handled by the browser
    }
  : callMicrotasksOnUIThread;

/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 *
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI)
 *   from the [JavaScript
 *   thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI
 */
// @ts-expect-error This overload is correct since it's what user sees in his code
// before it's transformed by Reanimated Babel plugin.
export function runOnUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => void;

export function runOnUI<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  if (
    __DEV__ &&
    !SHOULD_BE_USE_WEB &&
    !isWorkletFunction(worklet) &&
    !(worklet as unknown as WorkletImport).__bundleData
  ) {
    throw new WorkletsError('`runOnUI` can only be used with worklets.');
  }
  return (...args) => {
    if (IS_JEST) {
      // Mocking time in Jest is tricky as both requestAnimationFrame and queueMicrotask
      // callbacks run on the same queue and can be interleaved. There is no way
      // to flush particular queue in Jest and the only control over mocked timers
      // is by using jest.advanceTimersByTime() method which advances all types
      // of timers including immediate and animation callbacks. Ideally we'd like
      // to have some way here to schedule work along with React updates, but
      // that's not possible, and hence in Jest environment instead of using scheduling
      // mechanism we just schedule the work ommiting the queue. This is ok for the
      // uses that we currently have but may not be ok for future tests that we write.
      WorkletsModule.scheduleOnUI(
        makeShareableCloneRecursive(() => {
          'worklet';
          worklet(...args);
        })
      );
      return;
    }
    if (__DEV__) {
      // in DEV mode we call shareable conversion here because in case the object
      // can't be converted, we will get a meaningful stack-trace as opposed to the
      // situation when conversion is only done via microtask queue. This does not
      // make the app particularily less efficient as converted objects are cached
      // and for a given worklet the conversion only happens once.
      makeShareableCloneRecursive(worklet);
      makeShareableCloneRecursive(args);
    }

    enqueueUI(worklet, args);
  };
}

if (__DEV__) {
  function runOnUIWorklet(): void {
    'worklet';
    throw new WorkletsError(
      '`runOnUI` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }

  const shareableRunOnUIWorklet = makeShareableCloneRecursive(runOnUIWorklet);
  shareableMappingCache.set(runOnUI, shareableRunOnUIWorklet);
}

// @ts-expect-error Check `executeOnUIRuntimeSync` overload above.
export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => ReturnValue;

export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => ReturnValue {
  return (...args) => {
    return WorkletsModule.executeOnUIRuntimeSync(
      makeShareableCloneRecursive(() => {
        'worklet';
        const result = worklet(...args);
        return makeShareableCloneOnUIRecursive(result);
      })
    );
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
 * Lets you asynchronously run
 * non-[workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize)
 * functions that couldn't otherwise run on the [UI
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread).
 * This applies to most external libraries as they don't have their functions
 * marked with "worklet"; directive.
 *
 * @param fun - A reference to a function you want to execute on the JavaScript
 *   thread from the UI thread.
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnJS
 */
export function runOnJS<Args extends unknown[], ReturnValue>(
  fun:
    | ((...args: Args) => ReturnValue)
    | RemoteFunction<Args, ReturnValue>
    | WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  type FunDevRemote = Extract<typeof fun, DevRemoteFunction<Args, ReturnValue>>;
  if (SHOULD_BE_USE_WEB || !globalThis._WORKLET) {
    // if we are already on the JS thread, we just schedule the worklet on the JS queue
    return (...args) =>
      queueMicrotask(
        args.length
          ? () => (fun as (...args: Args) => ReturnValue)(...args)
          : (fun as () => ReturnValue)
      );
  }
  if (isWorkletFunction<Args, ReturnValue>(fun)) {
    // If `fun` is a worklet, we schedule a call of a remote function `runWorkletOnJS`
    // and pass the worklet as a first argument followed by original arguments.

    return (...args) =>
      runOnJS(runWorkletOnJS<Args, ReturnValue>)(
        fun as WorkletFunction<Args, ReturnValue>,
        ...args
      );
  }
  if ((fun as FunDevRemote).__remoteFunction) {
    // In development mode the function provided as `fun` throws an error message
    // such that when someone accidentally calls it directly on the UI runtime, they
    // see that they should use `runOnJS` instead. To facilitate that we put the
    // reference to the original remote function in the `__remoteFunction` property.
    fun = (fun as FunDevRemote).__remoteFunction;
  }

  const scheduleOnJS =
    typeof fun === 'function'
      ? global._scheduleHostFunctionOnJS
      : global._scheduleRemoteFunctionOnJS;

  return (...args) => {
    scheduleOnJS(
      fun as
        | ((...args: Args) => ReturnValue)
        | WorkletFunction<Args, ReturnValue>,
      args.length > 0 ? makeShareableCloneOnUIRecursive(args) : undefined
    );
  };
}

/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 *
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI)
 *   from the [JavaScript
 *   thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 * @returns A promise that resolves to the return value of the function passed
 *   as the first argument.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUIAsync
 */
export function runOnUIAsync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => Promise<ReturnValue> {
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
    throw new WorkletsError('`runOnUIAsync` can only be used with worklets.');
  }
  return (...args: Args) => {
    return new Promise<ReturnValue>((resolve) => {
      if (IS_JEST) {
        // Mocking time in Jest is tricky as both requestAnimationFrame and queueMicrotask
        // callbacks run on the same queue and can be interleaved. There is no way
        // to flush particular queue in Jest and the only control over mocked timers
        // is by using jest.advanceTimersByTime() method which advances all types
        // of timers including immediate and animation callbacks. Ideally we'd like
        // to have some way here to schedule work along with React updates, but
        // that's not possible, and hence in Jest environment instead of using scheduling
        // mechanism we just schedule the work ommiting the queue. This is ok for the
        // uses that we currently have but may not be ok for future tests that we write.
        WorkletsModule.scheduleOnUI(
          makeShareableCloneRecursive(() => {
            'worklet';
            worklet(...args);
          })
        );
        return;
      }
      if (__DEV__) {
        // in DEV mode we call shareable conversion here because in case the object
        // can't be converted, we will get a meaningful stack-trace as opposed to the
        // situation when conversion is only done via microtask queue. This does not
        // make the app particularily less efficient as converted objects are cached
        // and for a given worklet the conversion only happens once.
        makeShareableCloneRecursive(worklet);
        makeShareableCloneRecursive(args);
      }

      enqueueUI(worklet as WorkletFunction<Args, ReturnValue>, args, resolve);
    });
  };
}

if (__DEV__) {
  function runOnUIAsyncWorklet(): void {
    'worklet';
    throw new WorkletsError(
      '`runOnUIAsync` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }

  const shareableRunOnUIAsyncWorklet =
    makeShareableCloneRecursive(runOnUIAsyncWorklet);
  shareableMappingCache.set(runOnUIAsync, shareableRunOnUIAsyncWorklet);
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
      makeShareableCloneRecursive(() => {
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
