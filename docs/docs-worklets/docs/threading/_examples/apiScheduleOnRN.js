import { scheduleOnRN, scheduleOnUI } from '@site/src/simulation/worklets';

export function* onResult(result) {
  yield console.log('Result on the RN Runtime:', result);
}

export function* compute() {
  'worklet';
  const result = yield 2 + 2;
  yield scheduleOnRN(onResult, result);
}

export default function* main() {
  yield scheduleOnUI(compute);
}
