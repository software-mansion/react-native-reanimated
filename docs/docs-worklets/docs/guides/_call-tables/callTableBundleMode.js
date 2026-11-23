import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export function* showResult() {
  'worklet';
  yield console.log('UI received the result');
}

export function* sendResult() {
  'worklet';
  yield console.log('Worker is running');
  // Calling scheduleOnUI from a Worklet Runtime requires Bundle Mode.
  yield scheduleOnUI(showResult);
}

export default function* main() {
  const worker = yield createWorkletRuntime({ name: 'background' });
  yield scheduleOnRuntime(worker, sendResult);
}
