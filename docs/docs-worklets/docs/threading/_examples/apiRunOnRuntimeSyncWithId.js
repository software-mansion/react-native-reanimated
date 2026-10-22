import {
  createWorkletRuntime,
  runOnRuntimeSyncWithId,
} from '@site/src/simulation/worklets';

export function* compute() {
  'worklet';
  return yield 2 + 2;
}

export default function* main() {
  const workletRuntime = yield createWorkletRuntime({ name: 'background' });
  // Blocks the calling thread until the worklet finishes.
  const result = yield runOnRuntimeSyncWithId(
    workletRuntime.runtimeId,
    compute
  );
  yield console.log(result); // 4
}
