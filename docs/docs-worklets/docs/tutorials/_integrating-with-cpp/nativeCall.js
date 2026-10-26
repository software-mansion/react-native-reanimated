import {
  awaitPromise,
  createWorkletRuntime,
  globalThis,
  runOnRuntimeAsync,
} from '@site/src/simulation/worklets';

export function* callNativeAnswer() {
  'worklet';
  return yield globalThis.nativeAnswer();
}

export function* runExample(worker) {
  const promise = yield runOnRuntimeAsync(worker, callNativeAnswer);
  const result = yield awaitPromise(promise);
  yield console.log(result); // 42
}

export function* nativeAnswer() {
  'native';
  // Model the already installed HostFunction; the browser does not execute C++.
  return yield 42;
}

export function* installNativeAnswer() {
  'worklet';
  'hidden';
  yield (globalThis.nativeAnswer = nativeAnswer);
}

export default function* main() {
  'hidden';
  const worker = yield createWorkletRuntime({
    name: 'native-example',
    initializer: installNativeAnswer,
  });
  yield runExample(worker);
}
