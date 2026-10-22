import { createShareable, UIRuntimeId } from '@site/src/simulation/worklets';

export default function* main() {
  const shareable = yield createShareable(UIRuntimeId, 42);
  const value = yield shareable.getSync();
  yield console.log(value); // 42
}
