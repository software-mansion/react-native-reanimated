import { scheduleOnUI } from '../worklets';

export function* first() {
  yield console.log('first');
}

export function* second() {
  yield console.log('second');
}

export default function* main() {
  yield scheduleOnUI(first);
  yield console.log('between');
  yield scheduleOnUI(second);
  yield console.log('done');
}
