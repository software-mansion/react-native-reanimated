import {
  createSynchronizable,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export default function* main() {
  const synchronizable = yield createSynchronizable({ a: 42 });

  function* readOnUI() {
    'worklet';
    const value = yield synchronizable.getBlocking();
    yield console.log(value); // { a: 24 }
  }

  yield synchronizable.setBlocking({ a: 24 });
  yield scheduleOnUI(readOnUI);
}
