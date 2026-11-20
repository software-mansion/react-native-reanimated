import {
  createShareable,
  runOnUISync,
  UIRuntimeId,
} from '@site/src/simulation/worklets';

export default function* main() {
  const shareable = yield createShareable(UIRuntimeId, 42);

  function* updateOnHost() {
    'worklet';
    yield (shareable.value = shareable.value + 1);
    yield console.log('Host:', shareable.value); // 43
  }

  yield runOnUISync(updateOnHost);
  const value = yield shareable.getSync();
  yield console.log('Guest:', value); // 43
}
