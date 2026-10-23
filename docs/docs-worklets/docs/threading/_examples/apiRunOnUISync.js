import { runOnUISync } from '@site/src/simulation/worklets';

export function* myFunction(num) {
  'worklet';
  return yield num + 1;
}

export default function* main() {
  const result = yield runOnUISync(myFunction, 0);
  yield console.log(result); // 1
}
