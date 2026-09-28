import {
  createWorkletRuntime,
  getCurrentThreadId,
  scheduleOnRuntime,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export function* logTid() {
  'worklet';
  yield console.log(getCurrentThreadId());
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  yield logTid();
  yield scheduleOnUI(logTid);
  yield scheduleOnRuntime(worker, logTid);
}
