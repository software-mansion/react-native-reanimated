'use strict';

import { isJest, shouldBeUseWeb } from "./PlatformChecker.js";
import { makeShareableCloneOnUIRecursive, makeShareableCloneRecursive } from "./shareables.js";
import { isWorkletFunction } from "./workletFunction.js";
import { WorkletsError } from "./WorkletsError.js";
import { WorkletsModule } from "./WorkletsModule/index.js";
const IS_JEST = isJest();
const SHOULD_BE_USE_WEB = shouldBeUseWeb();

/** An array of [worklet, args] pairs. */
let _runOnUIQueue = [];
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

export function runOnUI(worklet) {
  'worklet';

  if (__DEV__ && !SHOULD_BE_USE_WEB && globalThis._WORKLET) {
    throw new WorkletsError('`runOnUI` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.');
  }
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
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
      WorkletsModule.scheduleOnUI(makeShareableCloneRecursive(() => {
        'worklet';

        worklet(...args);
      }));
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
    _runOnUIQueue.push([worklet, args]);
    if (_runOnUIQueue.length === 1) {
      queueMicrotask(() => {
        const queue = _runOnUIQueue;
        _runOnUIQueue = [];
        WorkletsModule.scheduleOnUI(makeShareableCloneRecursive(() => {
          'worklet';

          // eslint-disable-next-line @typescript-eslint/no-shadow
          queue.forEach(([worklet, args]) => {
            worklet(...args);
          });
          callMicrotasks();
        }));
      });
    }
  };
}

// @ts-expect-error Check `executeOnUIRuntimeSync` overload above.

export function executeOnUIRuntimeSync(worklet) {
  return (...args) => {
    return WorkletsModule.executeOnUIRuntimeSync(makeShareableCloneRecursive(() => {
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
export function runOnJS(fun) {
  'worklet';

  if (SHOULD_BE_USE_WEB || !globalThis._WORKLET) {
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
    scheduleOnJS(fun, args.length > 0 ?
    // TODO TYPESCRIPT this cast is terrible but will be fixed
    makeShareableCloneOnUIRecursive(args) : undefined);
  };
}
//# sourceMappingURL=threads.js.map