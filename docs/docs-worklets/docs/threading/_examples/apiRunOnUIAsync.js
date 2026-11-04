import { awaitPromise, runOnUIAsync } from '@site/src/simulation/worklets';

export function* compute() {
  'worklet';
  return yield 1;
}

export default function* main() {
  const pending = yield runOnUIAsync(compute);
  yield console.log('The RN Runtime continues while the result is pending');
  const result = yield awaitPromise(pending);
  yield console.log(result); // 1
}
