import {
  createSynchronizable,
  isSynchronizable,
} from '@site/src/simulation/worklets';

export default function* main() {
  const counter = yield createSynchronizable(0);

  yield console.log(isSynchronizable(counter)); // true
  yield console.log(isSynchronizable({ count: 0 })); // false

  if (isSynchronizable(counter)) {
    yield counter.setBlocking(42);
  }
  yield console.log(counter.getBlocking()); // 42
}
