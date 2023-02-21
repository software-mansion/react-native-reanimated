import NativeReanimatedModule from './NativeReanimated';
import { shouldBeUseWeb } from './PlatformChecker';
import { ComplexWorkletFunction } from './commonTypes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';
import { isJest, shouldBeUseWeb } from './PlatformChecker';

const IS_JEST = isJest();
let _lastSetImmediateFunction: Function | null = null;

let _runOnUIQueue: Array<[ComplexWorkletFunction<any[], any>, any[]]> = [];

export function setupSetImmediate() {
  'worklet';

  let immediateCalbacks: Array<() => void> = [];

  // @ts-ignore – typescript expects this to conform to NodeJS definition and expects the return value to be NodeJS.Immediate which is an object and not a number
  global.setImmediate = (callback: () => void): number => {
    immediateCalbacks.push(callback);
    return -1;
  };

  global.__flushImmediates = () => {
    for (let index = 0; index < immediateCalbacks.length; index += 1) {
      // we use classic 'for' loop because the size of the currentTasks array may change while executing some of the callbacks due to setImmediate calls
      immediateCalbacks[index]();
    }
    immediateCalbacks = [];
  };
}

function flushImmediatesOnUIThread() {
  'worklet';
  global.__flushImmediates();
}

export const flushImmediates = shouldBeUseWeb()
  ? () => {} // on web flushing is a noop as it is handled by the browser
  : flushImmediatesOnUIThread;

/**
 * Schedule a worklet to execute on the UI runtime. This method does not schedule the work immediately but instead
 * waits for other worklets to be scheduled within the same JS loop. It uses setImmediate to schedule all the worklets
 * at once making sure they will run within the same frame boundaries on the UI thread.
 */
export function runOnUI<A extends any[], R>(
  worklet: ComplexWorkletFunction<A, R>
): (...args: A) => void {
  if (__DEV__ && !shouldBeUseWeb()) {
    if (worklet.__workletHash === undefined) {
      throw new Error('runOnUI() can only be used on worklets');
    }
  }
  return (...args) => {
    if (IS_JEST) {
      // Jest mocks setImmediate method for each individual tests, because of that
      // we may end up not scheduling setImmediate call if the next test starts after
      // somce callbacks have been added to a batch from the previous test. To fix this
      // we reset the batch queue when setImmediate function changes.
      if (_lastSetImmediateFunction !== setImmediate) {
        _lastSetImmediateFunction = setImmediate;
        _runOnUIQueue = [];
      }
    }
    _runOnUIQueue.push([worklet, args]);
    if (_runOnUIQueue.length === 1) {
      setImmediate(() => {
        const queue = _runOnUIQueue;
        _runOnUIQueue = [];
        NativeReanimatedModule.scheduleOnUI(
          makeShareableCloneRecursive(() => {
            'worklet';
            queue.forEach(([worklet, args]) => {
              worklet(...args);
            });
            flushImmediates();
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
  if (__DEV__) {
    if (worklet.__workletHash === undefined) {
      throw new Error('runOnUI() can only be used on worklets');
    }
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

if (__DEV__) {
  try {
    runOnUI(() => {
      'worklet';
    });
  } catch (e) {
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
