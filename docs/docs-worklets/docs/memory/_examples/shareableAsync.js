import {
  awaitPromise,
  createShareable,
  UIRuntimeId,
} from '@site/src/simulation/worklets';

export default function* main() {
  const shareable = yield createShareable(UIRuntimeId, 42);
  const pending = yield shareable.getAsync();
  yield console.log('The RN Runtime continues while the host reads the value');
  const value = yield awaitPromise(pending);
  yield console.log(value); // 42
}
