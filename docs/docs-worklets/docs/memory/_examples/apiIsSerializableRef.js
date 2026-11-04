import {
  createSerializable,
  isSerializableRef,
} from '@site/src/simulation/worklets';

export default function* main() {
  const value = yield { count: 0 };
  const reference = yield createSerializable(value);

  yield console.log(isSerializableRef(reference)); // true
  yield console.log(isSerializableRef(value)); // false
}
