import {
  createSynchronizable,
  scheduleOnRN,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export default function* main() {
  const counter = yield createSynchronizable(0, { fixedType: true });

  function* report() {
    const value = yield counter.getBlocking();
    yield console.log(value); // 2: both increments have finished.
  }

  function* increment() {
    'worklet';
    yield counter.setBlocking((previous) => previous + 1);
    yield scheduleOnRN(report);
  }

  yield counter.setBlocking((previous) => previous + 1);
  yield scheduleOnUI(increment);
}
