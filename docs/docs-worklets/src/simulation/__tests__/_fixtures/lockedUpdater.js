import {
  createSynchronizable,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export default function* main() {
  const counter = yield createSynchronizable(0);
  const other = yield createSynchronizable(5);

  function* holdLock() {
    yield counter.lock();
    yield console.log('locked');
    yield console.log('still locked');
    yield counter.unlock();
  }

  yield scheduleOnUI(holdLock);
  yield console.log('waiting');
  yield counter.setBlocking((previous) => previous + other.getDirty());
  yield console.log(`counter ${counter.getDirty()}`);
}
