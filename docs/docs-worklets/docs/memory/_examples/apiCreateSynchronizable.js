import { createSynchronizable } from '@site/src/simulation/worklets';

export default function* main() {
  const synchronizable = yield createSynchronizable({ a: 42 });
  const counter = yield createSynchronizable(0, { fixedType: true });
}
