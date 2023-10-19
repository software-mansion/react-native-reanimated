'use strict';
import NativeReanimatedModule from './NativeReanimated';
import type { WorkletRuntime } from './runtimes';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';

export type BackgroundQueue = {
  __hostObjectBackgroundQueue: never;
};

export function createBackgroundQueue(name: string) {
  return NativeReanimatedModule.createBackgroundQueue(name);
}

export function runOnBackgroundQueue(
  backgroundQueue: BackgroundQueue,
  workletRuntime: WorkletRuntime,
  worklet: () => void
) {
  'worklet';
  // TODO: proper error handling
  if (_WORKLET) {
    _scheduleOnBackgroundQueue(
      backgroundQueue,
      workletRuntime,
      makeShareableCloneOnUIRecursive(worklet)
    );
  } else {
    NativeReanimatedModule.scheduleOnBackgroundQueue(
      backgroundQueue,
      workletRuntime,
      makeShareableCloneRecursive(worklet)
    );
  }
}
