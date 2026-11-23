import {
  isUIRuntime,
  createWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

export function* checkUI() {
  'worklet';
  yield console.log(isUIRuntime()); // true (UI Runtime)
}

export function* checkWorker() {
  'worklet';
  yield console.log(isUIRuntime()); // false (Worker Runtime)
}

export default function* main() {
  yield console.log(isUIRuntime()); // false (RN Runtime)
  yield scheduleOnUI(checkUI);
  const workerRuntime = yield createWorkletRuntime({ name: 'background' });
  yield scheduleOnRuntime(workerRuntime, checkWorker);
}
