import type { ComplexWorkletFunction } from './commonTypes';
import {
  setupCallGuard,
  setupConsole,
  setupRunOnJS,
  valueUnpacker,
} from './initializers';
import { makeShareableCloneRecursive } from './shareables';

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
};

export function createWorkletRuntime(
  name: string,
  initializer?: ComplexWorkletFunction<[], void>
) {
  // @ts-ignore valueUnpacker is a worklet
  const valueUnpackerCode = valueUnpacker.__initData.code;
  const runtime = global._createWorkletRuntime(name, valueUnpackerCode);

  runOnRuntimeSync(runtime, () => {
    'worklet';
    setupRunOnJS();
    setupConsole();
    setupCallGuard();
  });

  if (initializer !== undefined) {
    runOnRuntimeSync(runtime, initializer);
  }

  return runtime;
}

export function runOnRuntimeSync(
  runtime: WorkletRuntime,
  worklet: ComplexWorkletFunction<[], void>
) {
  global._runOnRuntime(runtime, makeShareableCloneRecursive(worklet));
}
