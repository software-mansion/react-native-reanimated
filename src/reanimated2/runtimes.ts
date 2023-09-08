import type { __ComplexWorkletFunction } from './commonTypes';
import { setupCallGuard, setupConsole } from './initializers';
import NativeReanimatedModule from './NativeReanimated';
import { makeShareableCloneRecursive } from './shareables';

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
  readonly name: string;
};

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
