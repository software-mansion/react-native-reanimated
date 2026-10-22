import {
  globalThis,
  scheduleOnRN,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export default function* main() {
  yield (globalThis.settings = { volume: 10 });

  function* logOriginal() {
    yield console.log('RN original:', globalThis.settings.volume); // 10
  }

  function* changeCopy(settings) {
    'worklet';
    yield (globalThis.settings = settings);
    yield (globalThis.settings.volume = 20);
    yield console.log('UI copy:', globalThis.settings.volume); // 20
    yield scheduleOnRN(logOriginal);
  }

  // The argument is serialized and reconstructed on the UI Runtime.
  yield scheduleOnUI(changeCopy, globalThis.settings);
}
