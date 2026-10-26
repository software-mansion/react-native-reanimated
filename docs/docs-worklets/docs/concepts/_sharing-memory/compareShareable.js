import {
  createShareable,
  scheduleOnRN,
  scheduleOnUI,
  UIRuntimeId,
} from '@site/src/simulation/worklets';

export default function* main() {
  const counter = yield createShareable(UIRuntimeId, 0);

  function* readOnRN() {
    const value = yield counter.getSync();
    yield console.log('RN:', value); // 1
  }

  function* incrementOnUI() {
    'worklet';
    yield (counter.value += 1);
    yield console.log('UI:', counter.value); // 1
    yield scheduleOnRN(readOnRN);
  }

  yield scheduleOnUI(incrementOnUI);
}
