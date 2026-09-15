import {
  createWorkletRuntime,
  getCurrentThreadId,
  runOnRuntimeSync,
  runOnUISync,
} from '../worklets';

export function* logTid() {
  'worklet';
  yield console.log(getCurrentThreadId());
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  yield logTid();
  yield runOnUISync(logTid);
  yield runOnRuntimeSync(worker, logTid);
}
