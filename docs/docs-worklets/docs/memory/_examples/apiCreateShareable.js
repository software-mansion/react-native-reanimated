import {
  createShareable,
  createWorkletRuntime,
  UIRuntimeId,
} from '@site/src/simulation/worklets';

export default function* main() {
  // Shareable hosted on the UI Runtime.
  const uiShareable = yield createShareable(UIRuntimeId, 'hello');

  // Shareable hosted on a Worker Runtime.
  const workerRuntime = yield createWorkletRuntime({ name: 'background' });
  const workerShareable = yield createShareable(
    workerRuntime.runtimeId,
    'hello'
  );

  const uiValue = yield uiShareable.getSync();
  const workerValue = yield workerShareable.getSync();
  yield console.log(uiValue, workerValue);
}
