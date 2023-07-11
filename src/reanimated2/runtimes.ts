import type { ComplexWorkletFunction } from './commonTypes';
import { valueUnpacker } from './initializers';
import { makeShareableCloneRecursive } from './shareables';

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: true;
};

export function createWorkletRuntime(name: string) {
  // @ts-ignore valueUnpacker is a worklet
  const valueUnpackerCode = valueUnpacker.__initData.code;
  const runtime = global._createWorkletRuntime(name, valueUnpackerCode);

  // we need to use different names because `_scheduleOnJS` is whitelisted
  const {
    _makeShareableClone: makeShareableClone,
    _scheduleOnJS: scheduleOnJS,
  } = global;
  runOnRuntimeSync(runtime, () => {
    'worklet';
    global._scheduleOnJS = scheduleOnJS;
    global._makeShareableClone = makeShareableClone;
  });

  // TODO: call user-defined initializer worklet

  return runtime;
}

function runOnRuntimeSync(
  runtime: WorkletRuntime,
  worklet: ComplexWorkletFunction<[], void>
) {
  global._runOnRuntime(runtime, makeShareableCloneRecursive(worklet));
}
