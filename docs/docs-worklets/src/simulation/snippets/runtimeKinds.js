import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from '../worklets';

export function* report(message) {
  yield console.log(message);
}

export function* work(where, input) {
  'worklet';
  yield console.log('working on', where);
  yield console.log('still working on', where);
  yield scheduleOnRN(report, `${where} finished with ${input * 2}`);
}

export default function* main() {
  const worker = yield createWorkletRuntime({ name: 'background' });
  yield scheduleOnUI(work, 'the UI', 1);
  yield scheduleOnRuntime(worker, work, 'the worker', 21);
  yield work('RN', 5);
}
