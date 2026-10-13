/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createSerializable,
  hasSerializableCounterpart,
  removeSerializableCounterpart,
  setSerializableCounterpart,
} from '..';

function setSerializableCounterpartTypeTests() {
  setSerializableCounterpart({ current: false }, { current: true });
  setSerializableCounterpart(() => {}, 42);
  setSerializableCounterpart({}, createSerializable({ current: true }));
  // @ts-expect-error Primitives can't have a counterpart.
  setSerializableCounterpart(42, 43);
  // @ts-expect-error Counterpart is required.
  setSerializableCounterpart({});
}

function hasSerializableCounterpartTypeTests() {
  const result: boolean = hasSerializableCounterpart({});
  // @ts-expect-error Primitives can't have a counterpart.
  hasSerializableCounterpart(42);
}

function removeSerializableCounterpartTypeTests() {
  removeSerializableCounterpart({});
  // @ts-expect-error Primitives can't have a counterpart.
  removeSerializableCounterpart(42);
}
