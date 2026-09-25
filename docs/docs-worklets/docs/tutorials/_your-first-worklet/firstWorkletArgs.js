import {
  createWorkletRuntime,
  getCurrentThreadId,
  scheduleOnRuntime,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export function* logMessage(message) {
  'worklet';
  yield console.log(`${message} from thread ${getCurrentThreadId()}`);
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  yield scheduleOnUI(logMessage, 'Hello');
  yield scheduleOnRuntime(worker, logMessage, 'Hi');
}
