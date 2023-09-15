import NativeReanimatedModule from './NativeReanimated';
import { isJest, shouldBeUseWeb } from './PlatformChecker';
import type { WorkletFunction } from './commonTypes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';

const IS_JEST = isJest();
const IS_NATIVE = !shouldBeUseWeb();

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

export const callMicrotasks = IS_NATIVE
  ? callMicrotasksOnUIThread
  : () => {
      // on web flushing is a noop as immediates are handled by the browser
    };

// @ts-expect-error This overload is correct since it's what user sees in his code
// before it's transformed by Reanimated Babel plugin.
export function runOnUI<Args extends unknown[], ReturnValue>(
  worklet: (...args: Args) => ReturnValue
): (...args: Args) => void;
/**
 * Schedule a worklet to execute on the UI runtime. This method does not schedule the work immediately but instead
 * waits for other worklets to be scheduled within the same JS loop. It uses queueMicrotask to schedule all the worklets
 * at once making sure they will run within the same frame boundaries on the UI thread.
 */
export function runOnUI<Args extends unknown[], ReturnValue>(
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  if (__DEV__ && IS_NATIVE && _WORKLET) {
    throw new Error(
      '[Reanimated] `runOnUI` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }
  if (__DEV__ && IS_NATIVE && worklet.__workletHash === undefined) {
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
    //
    _runOnUIQueue.push([worklet as WorkletFunction<unknown[], unknown>, args]);
    if (_runOnUIQueue.length === 1) {
      queueMicrotask(() => {
        const queue = _runOnUIQueue;
        _runOnUIQueue = [];
        NativeReanimatedModule.scheduleOnUI(
          makeShareableCloneRecursive(() => {
            'worklet';
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
  if (__DEV__ && IS_NATIVE && _WORKLET) {
    throw new Error(
      '[Reanimated] `runOnUIImmediately` cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }
  if (__DEV__ && IS_NATIVE && worklet.__workletHash === undefined) {
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

if (__DEV__ && IS_NATIVE) {
  const f = (() => {
    'worklet';
  }) as WorkletFunction<[], void>;
  if (f.__workletHash === undefined) {
    throw new Error(
      `[Reanimated] Failed to create a worklet. See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#failed-to-create-a-worklet\` for more details.`
    );
  }
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
 * Returns a function that can be called to be executed asynchronously on both
 * UI and JS threads.
 */
export function runOnJS<Args extends unknown[], ReturnValue>(
  fun:
    | ((...args: Args) => ReturnValue)
    | RemoteFunction<Args, ReturnValue>
    | WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  type FunWorklet = Extract<typeof fun, WorkletFunction<Args, ReturnValue>>;
  type FunDevRemote = Extract<typeof fun, DevRemoteFunction<Args, ReturnValue>>;
  if (!IS_NATIVE || !_WORKLET) {
    // if we are already on the JS thread, we just schedule the worklet on the JS queue
    return (...args) =>
      queueMicrotask(
        args.length
          ? () => (fun as (...args: Args) => ReturnValue)(...args)
          : (fun as () => ReturnValue)
      );
  }
  if ((fun as FunWorklet).__workletHash) {
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
    // reference to the original remote function in the `__functionInDEV` property.
    fun = (fun as FunDevRemote).__remoteFunction;
  }
  return (...args) => {
    _scheduleOnJS(
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
