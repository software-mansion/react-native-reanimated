import {
  createSynchronizable,
  scheduleOnRN,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export default function* main() {
  const counter = yield createSynchronizable(0);

  function* readOnRN() {
    yield console.log('RN:', counter.getBlocking()); // 1
  }

  function* incrementOnUI() {
    'worklet';
    yield counter.setBlocking((value) => value + 1);
    yield console.log('UI:', counter.getBlocking()); // 1
    yield scheduleOnRN(readOnRN);
  }

  yield scheduleOnUI(incrementOnUI);
}
