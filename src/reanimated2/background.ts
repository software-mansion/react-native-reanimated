'use strict';
import NativeReanimatedModule from './NativeReanimated';
import type { WorkletRuntime } from './runtimes';
import { makeShareableCloneOnUIRecursive } from './shareables';

export type BackgroundQueue = {
  __hostObjectBackgroundQueue: never;
};

export function createBackgroundQueue(name: string) {
  return NativeReanimatedModule.createBackgroundQueue(name);
}

export function runOnBackgroundQueue(
  backgroundQueue: BackgroundQueue,
  workletRuntime: WorkletRuntime,
  shareableWorklet: () => void
) {
  'worklet';
  if (!_WORKLET) {
    throw new Error(
      '[Reanimated] runOnBackgroundQueue can be only called from a worklet runtime.'
    );
  }
  // TODO: proper error handling
  // TODO: implement for RN runtime
  // TODO: support regular worklets, not only already shareable
  _scheduleOnBackgroundQueue(
    backgroundQueue,
    workletRuntime,
    makeShareableCloneOnUIRecursive(shareableWorklet)
  );
}
