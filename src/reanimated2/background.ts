'use strict';
import NativeReanimatedModule from './NativeReanimated';
import { shouldBeUseWeb } from './PlatformChecker';
import type { WorkletFunction } from './commonTypes';
import type { WorkletRuntime } from './runtimes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

export type BackgroundQueue = {
  __hostObjectBackgroundQueue: never;
};

export function createBackgroundQueue(name: string) {
  return NativeReanimatedModule.createBackgroundQueue(name);
}

// @ts-expect-error Check `runOnUI` overload.
export function runOnBackgroundQueue<Args extends unknown[], ReturnValue>(
  backgroundQueue: BackgroundQueue,
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;
/**
 * Schedule a worklet to execute on the background queue.
 */
export function runOnBackgroundQueue<Args extends unknown[], ReturnValue>(
  backgroundQueue: BackgroundQueue,
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  if (__DEV__ && !SHOULD_BE_USE_WEB && worklet.__workletHash === undefined) {
    throw new Error(
      '[Reanimated] The function passed to `runOnBackgroundQueue` is not a worklet.'
    );
  }
  if (_WORKLET) {
    return (...args) =>
      _scheduleOnBackgroundQueue(
        backgroundQueue,
        workletRuntime,
        makeShareableCloneOnUIRecursive(() => {
          'worklet';
          worklet(...args);
        })
      );
  } else {
    return (...args) =>
      NativeReanimatedModule.scheduleOnBackgroundQueue(
        backgroundQueue,
        workletRuntime,
        makeShareableCloneRecursive(() => {
          'worklet';
          worklet(...args);
        })
      );
  }
}
