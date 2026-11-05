import { globalThis, runOnUISync } from '@site/src/simulation/worklets';

export default function* main() {
  yield (globalThis.someValue = 42);
  const localSomeValue = yield globalThis.someValue;

  function* assignGlobal() {
    'worklet';
    yield (globalThis.someValue = localSomeValue);
  }

  function* logSomeValue(label) {
    'worklet';
    yield console.log(label, globalThis.someValue);
  }

  yield runOnUISync(logSomeValue, 'UI global before:'); // undefined
  yield runOnUISync(assignGlobal);
  yield runOnUISync(logSomeValue, 'UI global after:'); // 42
}
