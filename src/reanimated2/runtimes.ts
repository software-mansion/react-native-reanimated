'use strict';
import type { __ComplexWorkletFunction } from './commonTypes';
import { setupCallGuard, setupConsole } from './initializers';
import NativeReanimatedModule from './NativeReanimated';
import { makeShareableCloneRecursive } from './shareables';

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
