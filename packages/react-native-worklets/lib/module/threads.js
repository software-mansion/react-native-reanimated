'use strict';

import { IS_JEST, SHOULD_BE_USE_WEB } from "./PlatformChecker/index.js";
import { RuntimeKind } from "./runtimeKind.js";
import { createSerializable, makeShareableCloneOnUIRecursive } from "./serializable.js";
import { serializableMappingCache } from "./serializableMappingCache.js";
import { isWorkletFunction } from "./workletFunction.js";
import { WorkletsError } from "./WorkletsError.js";
import { WorkletsModule } from "./WorkletsModule/index.js";
let runOnUIQueue = [];
export function setupMicrotasks() {
  'worklet';

  let microtasksQueue = [];
  let isExecutingMicrotasksQueue = false;
  global.queueMicrotask = callback => {
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
      global._microtaskQueueFinalizers.forEach(finalizer => finalizer());
    } finally {
      isExecutingMicrotasksQueue = false;
    }
  };
}
function callMicrotasksOnUIThread() {
  'worklet';

  global.__callMicrotasks();
}
export const callMicrotasks = SHOULD_BE_USE_WEB ? () => {
  // on web flushing is a noop as immediates are handled by the browser
} : callMicrotasksOnUIThread;

/**
 * Lets you schedule a function to be executed on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 *
 * - The callback executes asynchronously and doesn't return a value.
 * - Passed function and args are automatically
 *   [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 *   and serialized.
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime)
 *   or [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime),
 *   unless you have the [Bundle Mode](/docs/experimental/bundleMode) enabled.
 *
 * @param fun - A reference to a function you want to schedule on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 * @param args - Arguments to pass to the function.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI
 */
export function scheduleOnUI(worklet, ...args) {
  runOnUI(worklet)(...args);
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
// @ts-expect-error This overload is correct since it's what user sees in his code
// before it's transformed by Reanimated Babel plugin.

export function runOnUI(worklet) {
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet) && !worklet.__bundleData) {
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
      WorkletsModule.scheduleOnUI(createSerializable(() => {
        'worklet';

        worklet(...args);
      }));
      return;
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
  };
}
if (__DEV__) {
  function runOnUIWorklet() {
    'worklet';

    throw new WorkletsError('`runOnUI` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.');
  }
  const serializableRunOnUIWorklet = createSerializable(runOnUIWorklet);
  serializableMappingCache.set(runOnUI, serializableRunOnUIWorklet);
}

/**
 * Lets you run a function synchronously on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime)
 * from the [RN
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#react-native-runtime-rn-runtime).
 * Passed function and args are automatically
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * and serialized.
 *
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 * - This function cannot be called from a [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime).
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 * @param args - Arguments to pass to the function.
 * @returns The return value of the function passed as the first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUISync
 */
export function runOnUISync(worklet, ...args) {
  return executeOnUIRuntimeSync(worklet)(...args);
}

// @ts-expect-error Check `executeOnUIRuntimeSync` overload above.

export function executeOnUIRuntimeSync(worklet) {
  return (...args) => {
    return WorkletsModule.executeOnUIRuntimeSync(createSerializable(() => {
      'worklet';

      const result = worklet(...args);
      return makeShareableCloneOnUIRecursive(result);
    }));
  };
}
function runWorkletOnJS(worklet, ...args) {
  // remote function that calls a worklet synchronously on the JS runtime
  worklet(...args);
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
export function runOnJS(fun) {
  'worklet';

  if (SHOULD_BE_USE_WEB || globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
    // if we are already on the JS thread, we just schedule the worklet on the JS queue
    return (...args) => queueMicrotask(args.length ? () => fun(...args) : fun);
  }
  if (isWorkletFunction(fun)) {
    // If `fun` is a worklet, we schedule a call of a remote function `runWorkletOnJS`
    // and pass the worklet as a first argument followed by original arguments.

    return (...args) => runOnJS(runWorkletOnJS)(fun, ...args);
  }
  if (fun.__remoteFunction) {
    // In development mode the function provided as `fun` throws an error message
    // such that when someone accidentally calls it directly on the UI runtime, they
    // see that they should use `runOnJS` instead. To facilitate that we put the
    // reference to the original remote function in the `__remoteFunction` property.
    fun = fun.__remoteFunction;
  }
  const scheduleOnJS = typeof fun === 'function' ? global._scheduleHostFunctionOnJS : global._scheduleRemoteFunctionOnJS;
  return (...args) => {
    scheduleOnJS(fun, args.length > 0 ? makeShareableCloneOnUIRecursive(args) : undefined);
  };
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
export function scheduleOnRN(fun, ...args) {
  'worklet';

  runOnJS(fun)(...args);
}

/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 *
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 *   from the [JavaScript
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#javascript-runtime).
 * @returns A promise that resolves to the return value of the function passed
 *   as the first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUIAsync
 */
export function runOnUIAsync(worklet) {
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
    throw new WorkletsError('`runOnUIAsync` can only be used with worklets.');
  }
  return (...args) => {
    return new Promise(resolve => {
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
        WorkletsModule.scheduleOnUI(createSerializable(() => {
          'worklet';

          worklet(...args);
        }));
        return;
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
      enqueueUI(worklet, args, resolve);
    });
  };
}
if (__DEV__) {
  function runOnUIAsyncWorklet() {
    'worklet';

    throw new WorkletsError('`runOnUIAsync` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.');
  }
  const serializableRunOnUIAsyncWorklet = createSerializable(runOnUIAsyncWorklet);
  serializableMappingCache.set(runOnUIAsync, serializableRunOnUIAsyncWorklet);
}
function enqueueUI(worklet, args, resolve) {
  const job = [worklet, args, resolve];
  runOnUIQueue.push(job);
  if (runOnUIQueue.length === 1) {
    flushUIQueue();
  }
}
function flushUIQueue() {
  queueMicrotask(() => {
    const queue = runOnUIQueue;
    runOnUIQueue = [];
    WorkletsModule.scheduleOnUI(createSerializable(() => {
      'worklet';

      queue.forEach(([workletFunction, workletArgs, jobResolve]) => {
        const result = workletFunction(...workletArgs);
        if (jobResolve) {
          runOnJS(jobResolve)(result);
        }
      });
      callMicrotasks();
    }));
  });
}

/**
 * Added temporarily for integration with `react-native-audio-api`. Don't depend
 * on this API as it may change without notice.
 */
// eslint-disable-next-line camelcase
export function unstable_eventLoopTask(worklet) {
  return (...args) => {
    'worklet';

    worklet(...args);
    callMicrotasks();
  };
}
//# sourceMappingURL=threads.js.map