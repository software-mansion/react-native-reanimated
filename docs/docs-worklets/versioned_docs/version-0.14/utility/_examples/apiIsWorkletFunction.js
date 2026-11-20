import { isWorkletFunction } from '@site/src/simulation/worklets';

export function* workletFunction() {
  'worklet';
  return yield 1;
}

export function* nonWorkletFunction() {
  return yield 1;
}

export default function* main() {
  const isWorklet = yield isWorkletFunction(workletFunction);
  yield console.log(isWorklet); // true

  const isNonWorklet = yield isWorkletFunction(nonWorkletFunction);
  yield console.log(isNonWorklet); // false
}
