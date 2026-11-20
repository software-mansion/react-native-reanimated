import {
  createWorkletRuntime,
  runOnRuntimeSync,
  runOnUISync,
} from '@site/src/simulation/worklets';

export function* foo() {
  return yield 42;
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  const uiResult = yield runOnUISync(foo);
  const workerResult = yield runOnRuntimeSync(worker, foo);
  yield console.log(uiResult, workerResult);
}
