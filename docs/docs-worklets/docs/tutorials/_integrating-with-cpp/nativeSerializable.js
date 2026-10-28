import {
  awaitPromise,
  createSerializable,
  createWorkletRuntime,
  globalThis,
  runOnRuntimeAsync,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

export function* readNativeVolume() {
  'worklet';
  return yield globalThis.nativeSettings.volume;
}

export function* runExample(worker, NativeExample) {
  const settings = { volume: 10 };
  const settingsRef = yield createSerializable(settings);
  yield NativeExample.scheduleWithSettings(worker, settingsRef);

  const promise = yield runOnRuntimeAsync(worker, readNativeVolume);
  const volume = yield awaitPromise(promise);
  yield console.log('Worker copy:', volume); // 20
  yield console.log('RN original:', settings.volume); // 10
}

export function* applyNativeSettings(settings) {
  'native';
  // Model toJSValue(workerRuntime) and the C++ callback's JSI writes.
  yield (globalThis.nativeSettings = settings);
  yield (globalThis.nativeSettings.volume = settings.volume * 2);
}

export function* scheduleNativeWorkWithSettings(worker, settingsRef) {
  'native';
  // Model capturing the Serializable and reconstructing it on the worker.
  yield scheduleOnRuntime(worker, applyNativeSettings, settingsRef);
  return yield true;
}

export default function* main() {
  'hidden';
  const worker = yield createWorkletRuntime({ name: 'native-example' });
  yield runExample(worker, {
    scheduleWithSettings: scheduleNativeWorkWithSettings,
  });
}
