import {
  awaitPromise,
  createWorkletRuntime,
  globalThis,
  runOnRuntimeAsync,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

export function* readNativeResult() {
  'worklet';
  return yield globalThis.nativeWorkFinished;
}

export function* runExample(worker, NativeExample) {
  yield NativeExample.schedule(worker);
  const promise = yield runOnRuntimeAsync(worker, readNativeResult);
  const finished = yield awaitPromise(promise);
  yield console.log(finished); // true
}

export function* nativeWork() {
  'native';
  // Model the C++ callback's JSI write on the worker runtime.
  yield (globalThis.nativeWorkFinished = true);
}

export function* scheduleNativeWork(worker) {
  'native';
  // Model worker->schedule(...); the browser does not execute C++.
  yield scheduleOnRuntime(worker, nativeWork);
  return yield true;
}

export default function* main() {
  'hidden';
  const worker = yield createWorkletRuntime({
    name: 'native-example',
  });
  yield runExample(worker, { schedule: scheduleNativeWork });
}
