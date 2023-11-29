'use strict';
import type { __ComplexWorkletFunction, WorkletFunction } from './commonTypes';
import { setupCallGuard, setupConsole } from './initializers';
import NativeReanimatedModule from './NativeReanimated';
import { shouldBeUseWeb } from './PlatformChecker';
import {
  makeShareableCloneOnUIRecursive,
  makeShareableCloneRecursive,
} from './shareables';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
  readonly name: string;
};

/**
 * Lets you create a new JS runtime which can be used to run worklets possibly on different threads than JS or UI thread.
 *
 * @param name - A name used to identify the runtime which will appear in devices list in Chrome DevTools.
 * @param initializer - An optional worklet that will be run synchronously on the same thread immediately after the runtime is created.
 * @returns WorkletRuntime which is a jsi::HostObject\<reanimated::WorkletRuntime\> - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/createWorkletRuntime
 */
export function createWorkletRuntime(
  name: string,
  initializer?: __ComplexWorkletFunction<[], void>
) {
  return NativeReanimatedModule.createWorkletRuntime(
    name,
    makeShareableCloneRecursive(() => {
      'worklet';
      setupCallGuard();
      setupConsole();
      initializer?.();
    })
  );
}

// @ts-expect-error Check `runOnUI` overload.
export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: (...args: Args) => ReturnValue
): WorkletFunction<Args, ReturnValue>;
/**
 * Schedule a worklet to execute on the background queue.
 */
export function runOnRuntime<Args extends unknown[], ReturnValue>(
  workletRuntime: WorkletRuntime,
  worklet: WorkletFunction<Args, ReturnValue>
): (...args: Args) => void {
  'worklet';
  if (__DEV__ && !SHOULD_BE_USE_WEB && worklet.__workletHash === undefined) {
    throw new Error(
      '[Reanimated] The function passed to `runOnRuntime` is not a worklet.' +
        (_WORKLET
          ? ' Please make sure that `processNestedWorklets` option in Reanimated Babel plugin is enabled.'
          : '')
    );
  }
  if (_WORKLET) {
    return (...args) =>
      _scheduleOnRuntime(
        workletRuntime,
        makeShareableCloneOnUIRecursive(() => {
          'worklet';
          worklet(...args);
        })
      );
  }
  return (...args) =>
    NativeReanimatedModule.scheduleOnRuntime(
      workletRuntime,
      makeShareableCloneRecursive(() => {
        'worklet';
        worklet(...args);
      })
    );
}
