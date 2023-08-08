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

export function createWorkletRuntime(name: string) {
  // @ts-ignore valueUnpacker is a worklet
  const valueUnpackerCode = valueUnpacker.__initData.code;
  const runtime = global._createWorkletRuntime(name, valueUnpackerCode);

  runOnRuntimeSync(runtime, () => {
    'worklet';
    setupRunOnJS();
    setupConsole();
    setupCallGuard();

    // TODO: call user-defined initializer worklet
  });

  return runtime;
}

export function runOnRuntimeSync(
  runtime: WorkletRuntime,
  worklet: ComplexWorkletFunction<[], void>
) {
  // TODO: fix error when function is not a worklet
  global._runOnRuntime(runtime, makeShareableCloneRecursive(worklet));
}
