import NativeReanimatedModule from './NativeReanimated';
import { isJest, shouldBeUseWeb } from './PlatformChecker';
import { ComplexWorkletFunction } from './commonTypes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';

const IS_JEST = isJest();
const IS_WEB = shouldBeUseWeb();

let _runOnUIQueue: Array<[ComplexWorkletFunction<any[], any>, any[]]> = [];

export function setupMicrotasks() {
  'worklet';

  let microtasksQueue: Array<() => void> = [];
  let isExecutingMicrotasksQueue = false;

  // @ts-ignore – typescript expects this to conform to NodeJS definition and expects the return value to be NodeJS.Immediate which is an object and not a number
  global.queueMicrotask = (callback: () => void): number => {
    microtasksQueue.push(callback);
    return -1;
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

export const callMicrotasks = shouldBeUseWeb()
  ? () => {
      // on web flushing is a noop as immediates are handled by the browser
    }
  : callMicrotasksOnUIThread;

/**
 * Schedule a worklet to execute on the UI runtime. This method does not schedule the work immediately but instead
 * waits for other worklets to be scheduled within the same JS loop. It uses queueMicrotask to schedule all the worklets
 * at once making sure they will run within the same frame boundaries on the UI thread.
 */
export function runOnUI<A extends any[], R>(
  worklet: ComplexWorkletFunction<A, R>
): (...args: A) => void {
  'worklet';
  if (__DEV__ && !IS_WEB && _WORKLET) {
    throw new Error(
      'runOnUI() cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }
  if (__DEV__ && !IS_WEB && worklet.__workletHash === undefined) {
    throw new Error('runOnUI() can only be used on worklets');
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
    _runOnUIQueue.push([worklet, args]);
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

/**
 * Schedule a worklet to execute on the UI runtime skipping batching mechanism.
 */
export function runOnUIImmediately<A extends any[], R>(
  worklet: ComplexWorkletFunction<A, R>
): (...args: A) => void {
  'worklet';
  if (__DEV__ && !IS_WEB && _WORKLET) {
    throw new Error(
      'runOnUIImmediately() cannot be called on the UI runtime. Please call the function synchronously or use `queueMicrotask` or `requestAnimationFrame` instead.'
    );
  }
  if (__DEV__ && !IS_WEB && worklet.__workletHash === undefined) {
    throw new Error('runOnUIImmediately() can only be used on worklets');
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

if (__DEV__ && !IS_WEB) {
  const f = () => {
    'worklet';
  };
  // @ts-ignore plugin
  if (f.__workletHash === undefined) {
    throw new Error(
      'Failed to create a worklet. Did you forget to add Reanimated Babel plugin in babel.config.js? See installation docs at https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation#babel-plugin.'
    );
  }
}

export function runOnJS<A extends any[], R>(
  fun: ComplexWorkletFunction<A, R>
): (...args: A) => void {
  'worklet';
  if (fun.__remoteFunction) {
    // in development mode the function provided as `fun` throws an error message
    // such that when someone accidently calls it directly on the UI runtime, they
    // see that they should use `runOnJS` instead. To facilitate that we purt the
    // reference to the original remote function in the `__remoteFunction` property.
    fun = fun.__remoteFunction;
  }
  if (!_WORKLET) {
    return fun;
  }
  return (...args) => {
    _scheduleOnJS(
      fun,
      args.length > 0 ? makeShareableCloneOnUIRecursive(args) : undefined
    );
  };
}
