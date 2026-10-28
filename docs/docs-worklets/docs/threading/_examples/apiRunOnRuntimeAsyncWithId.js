import {
  awaitPromise,
  createWorkletRuntime,
  runOnRuntimeAsyncWithId,
} from '@site/src/simulation/worklets';

export function* sum(numbers) {
  'worklet';
  return yield numbers.reduce((total, n) => total + n, 0);
}

export default function* main() {
  const workletRuntime = yield createWorkletRuntime({ name: 'background' });
  const data = yield [1, 2, 3, 4];
  const pending = yield runOnRuntimeAsyncWithId(
    workletRuntime.runtimeId,
    sum,
    data
  );
  yield console.log('The RN Runtime continues while the worker computes');
  const result = yield awaitPromise(pending);
  yield console.log('Computation result:', result); // 10
}
