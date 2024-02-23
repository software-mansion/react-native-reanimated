'use strict';
import NativeReanimatedModule from './NativeReanimated';
import { isJest, shouldBeUseWeb } from './PlatformChecker';
import type { WorkletFunction } from './commonTypes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';
import { isWorkletFunction } from './commonTypes';

const IS_JEST = isJest();
const SHOULD_BE_USE_WEB = shouldBeUseWeb();

/**
 * An array of [worklet, args] pairs.
 * */
let _runOnUIQueue: Array<[WorkletFunction<unknown[], unknown>, unknown[]]> = [];

export function setupMicrotasks() {
  'worklet';

  let microtasksQueue: Array<() => void> = [];
  let isExecutingMicrotasksQueue = false;
  global.queueMicrotask = (callback: () => void) => {
    microtasksQueue.push(callback);
  };

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
      global._maybeFlushUIUpdatesQueue();
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
 * Lets you asynchronously run [workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize) functions on the [UI thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 *
 * This method does not schedule the work immediately but instead waits for other worklets
 * to be scheduled within the same JS loop. It uses queueMicrotask to schedule all the worklets
 * at once making sure they will run within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI) from the [JavaScript thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 * @returns A function that accepts arguments for the function passed as the first argument.
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
  'worklet';
  if (__DEV__ && !SHOULD_BE_USE_WEB && _WORKLET) {
    throw new Error(
      '[Reanimated] `runOnUI` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
    throw new Error('[Reanimated] `runOnUI` can only be used on worklets.');
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
      NativeReanimatedModule.scheduleOnUI(
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
    _runOnUIQueue.push([worklet as WorkletFunction, args]);
    if (_runOnUIQueue.length === 1) {
      queueMicrotask(() => {
        const queue = _runOnUIQueue;
        _runOnUIQueue = [];
        NativeReanimatedModule.scheduleOnUI(
          makeShareableCloneRecursive(() => {
            'worklet';
            // eslint-disable-next-line @typescript-eslint/no-shadow
            queue.forEach(([worklet, args]) => {
              worklet(...args);
            });
            callMicrotasks();
          })
        );
      });
    }
  };
}

// @ts-expect-error Check `executeOnUIRuntimeSync` overload above.
export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => ReturnValue;

export function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => ReturnValue {
  return (...args) => {
    return NativeReanimatedModule.executeOnUIRuntimeSync(
      makeShareableCloneRecursive(() => {
        'worklet';
        const result = worklet(...args);
        return makeShareableCloneOnUIRecursive(result);
      })
    );
  };
}

// @ts-expect-error Check `runOnUI` overload above.
export function runOnUIImmediately<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;
/**
 * Schedule a worklet to execute on the UI runtime skipping batching mechanism.
 */
export function runOnUIImmediately<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  if (__DEV__ && !SHOULD_BE_USE_WEB && _WORKLET) {
    throw new Error(
      '[Reanimated] `runOnUIImmediately` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }
  if (__DEV__ && !SHOULD_BE_USE_WEB && !isWorkletFunction(worklet)) {
    throw new Error(
      '[Reanimated] `runOnUIImmediately` can only be used on worklets.'
    );
  }
  return (...args) => {
    NativeReanimatedModule.scheduleOnUI(
      makeShareableCloneRecursive(() => {
        'worklet';
        worklet(...args);
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
 * Lets you asynchronously run non-[workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize) functions that couldn't otherwise run on the [UI thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread).
 * This applies to most external libraries as they don't have their functions marked with "worklet"; directive.
 *
 * @param fun - A reference to a function you want to execute on the JavaScript thread from the UI thread.
 * @returns A function that accepts arguments for the function passed as the first argument.
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
  if (SHOULD_BE_USE_WEB || !_WORKLET) {
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
  return (...args) => {
    global._scheduleOnJS(
      fun as
        | ((...args: Args) => ReturnValue)
        | WorkletFunction<Args, ReturnValue>,
      args.length > 0
        ? // TODO TYPESCRIPT this cast is terrible but will be fixed
          (makeShareableCloneOnUIRecursive(args) as unknown as unknown[])
        : undefined
    );
  };
}
