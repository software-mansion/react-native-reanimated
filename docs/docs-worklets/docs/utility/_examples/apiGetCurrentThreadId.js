import {
  getCurrentThreadId,
  runOnUISync,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export function* logThread() {
  'worklet';
  yield console.log(getCurrentThreadId());
}

export default function* main() {
  yield logThread(); // The JS thread id.
  yield scheduleOnUI(logThread); // The UI thread id.
  yield runOnUISync(logThread); // The JS thread id.
}
