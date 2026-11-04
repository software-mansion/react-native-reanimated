import { scheduleOnUI } from '@site/src/simulation/worklets';

export function* myFunction() {
  'worklet';
  yield console.log('Hello from the UI Runtime!');
}

export default function* main() {
  yield scheduleOnUI(myFunction);
  yield console.log('The RN Runtime continues');
}
