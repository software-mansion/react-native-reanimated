import { globalThis, runOnUISync } from '@site/src/simulation/worklets';

export default function* main() {
  yield (globalThis.someValue = 42);

  function* logSomeValue(label) {
    'worklet';
    yield console.log(label, globalThis.someValue);
  }

  yield logSomeValue('RN global:'); // RN global: 42
  // The UI Runtime has its own global scope.
  yield runOnUISync(logSomeValue, 'UI global:'); // UI global: undefined
}
