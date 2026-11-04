import {
  createSerializable,
  globalThis,
  scheduleOnRN,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export default function* main() {
  yield (globalThis.counter = { value: 0 });
  const reference = yield createSerializable(globalThis.counter);

  function* readOnRN() {
    yield console.log('RN:', globalThis.counter.value); // 0
  }

  function* incrementOnUI(counter) {
    'worklet';
    yield (globalThis.counter = counter);
    yield (globalThis.counter.value += 1);
    yield console.log('UI:', globalThis.counter.value); // 1
    yield scheduleOnRN(readOnRN);
  }

  yield scheduleOnUI(incrementOnUI, reference);
}
