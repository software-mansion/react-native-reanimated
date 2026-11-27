import {
  getRuntimeKind,
  createWorkletRuntime,
  scheduleOnUI,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

export function* checkUI() {
  'worklet';
  yield console.log(getRuntimeKind()); // 2 (UI Runtime)
}

export function* checkWorker() {
  'worklet';
  yield console.log(getRuntimeKind()); // 3 (Worker Runtime)
}

export default function* main() {
  yield console.log(getRuntimeKind()); // 1 (RN Runtime)
  yield scheduleOnUI(checkUI);
  const workerRuntime = yield createWorkletRuntime({ name: 'background' });
  yield scheduleOnRuntime(workerRuntime, checkWorker);
}
