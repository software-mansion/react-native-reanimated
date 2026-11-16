import {
  isRNRuntime,
  createWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

export function* checkUI() {
  'worklet';
  yield console.log(isRNRuntime()); // false (UI Runtime)
}

export function* checkWorker() {
  'worklet';
  yield console.log(isRNRuntime()); // false (Worker Runtime)
}

export default function* main() {
  yield console.log(isRNRuntime()); // true (RN Runtime)
  yield scheduleOnUI(checkUI);
  const workerRuntime = yield createWorkletRuntime({ name: 'background' });
  yield scheduleOnRuntime(workerRuntime, checkWorker);
}
