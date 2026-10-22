import { setTimeout } from '@site/src/simulation/worklets';

export function* later() {
  yield console.log('Timer callback on the RN Runtime');
}

export default function* main() {
  yield setTimeout(later, 16);
  yield console.log('Synchronous work runs first');
}
