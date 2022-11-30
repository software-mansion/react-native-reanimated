import NativeReanimatedModule from './NativeReanimated';
import { ComplexWorkletFunction } from './commonTypes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';

export function runOnUI<A extends any[], R>(
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
        return worklet(...args);
      })
    );
  };
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
