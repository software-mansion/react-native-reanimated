import type { ComplexWorkletFunction } from './commonTypes';
import { setupCallGuard, setupConsole } from './initializers';
import { runOnRuntimeSync } from './threads';
import NativeReanimatedModule from './NativeReanimated';

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
  readonly name: string;
};

export function createWorkletRuntime(
  name: string,
  initializer?: ComplexWorkletFunction<[], void>
) {
  const runtime = NativeReanimatedModule.createWorkletRuntime(name);

  runOnRuntimeSync(runtime, () => {
    'worklet';
    setupCallGuard();
    setupConsole();
  })();

  if (initializer !== undefined) {
    runOnRuntimeSync(runtime, initializer)();
  }

  return runtime;
}
