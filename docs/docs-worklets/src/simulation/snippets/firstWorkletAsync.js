import {
  createWorkletRuntime,
  getCurrentThreadId,
  scheduleOnRuntime,
  scheduleOnUI,
} from '../worklets';

export function* logTid() {
  'worklet';
  yield console.log(getCurrentThreadId());
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  yield scheduleOnUI(logTid);
  yield scheduleOnRuntime(worker, logTid);
}
