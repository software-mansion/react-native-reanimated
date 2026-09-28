import { scheduleOnUI, scheduleOnRN } from '../worklets';

export function* onDone(result) {
  yield console.log('RN got', result);
}

export function* compute() {
  'worklet';
  yield console.log('computing on UI');
  yield console.log('still computing on UI');
  yield scheduleOnRN(onDone, 42);
}

export function* continueOnRN() {
  yield console.log('RN keeps working');
  yield console.log('while UI computes');
}

export default function* main() {
  yield scheduleOnUI(compute);
  yield scheduleOnRN(continueOnRN);
  yield console.log('RN continues');
}
