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
