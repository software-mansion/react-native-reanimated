/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createSerializable,
  hasSerializableReplacement,
  removeSerializableReplacement,
  setSerializableReplacement,
} from '..';

function setSerializableReplacementTypeTests() {
  setSerializableReplacement({ current: false }, { current: true });
  setSerializableReplacement(() => {}, 42);
  setSerializableReplacement({}, createSerializable({ current: true }));
  // @ts-expect-error Primitives can't be replaced.
  setSerializableReplacement(42, 43);
  // @ts-expect-error Replacement is required.
  setSerializableReplacement({});
}

function hasSerializableReplacementTypeTests() {
  const result: boolean = hasSerializableReplacement({});
  // @ts-expect-error Primitives can't be replaced.
  hasSerializableReplacement(42);
}

function removeSerializableReplacementTypeTests() {
  removeSerializableReplacement({});
  // @ts-expect-error Primitives can't be replaced.
  removeSerializableReplacement(42);
}
