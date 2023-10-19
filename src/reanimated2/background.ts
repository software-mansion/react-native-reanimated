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

export function runOnBackgroundQueue(
  backgroundQueue: BackgroundQueue,
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<[], void>
) {
  'worklet';
  if (__DEV__ && !SHOULD_BE_USE_WEB && worklet.__workletHash === undefined) {
    throw new Error(
      '[Reanimated] The function passed to `runOnBackgroundQueue` is not a worklet.'
    );
  }
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
