/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createSerializable,
  getSerializableMapping,
  hasSerializableMapping,
  removeSerializableMapping,
  type SerializableRef,
  setSerializableMapping,
} from '..';

function setSerializableMappingTypeTests() {
  setSerializableMapping({ current: false }, { current: true });
  setSerializableMapping(() => {}, 42);
  setSerializableMapping({}, createSerializable({ current: true }));
  // @ts-expect-error Primitives can't have a mapping.
  setSerializableMapping(42, 43);
  // @ts-expect-error Mapping is required.
  setSerializableMapping({});
}

function getSerializableMappingTypeTests() {
  const result: SerializableRef | undefined = getSerializableMapping({});
  // @ts-expect-error Primitives can't have a mapping.
  getSerializableMapping(42);
}

function hasSerializableMappingTypeTests() {
  const result: boolean = hasSerializableMapping({});
  // @ts-expect-error Primitives can't have a mapping.
  hasSerializableMapping(42);
}

function removeSerializableMappingTypeTests() {
  removeSerializableMapping({});
  // @ts-expect-error Primitives can't have a mapping.
  removeSerializableMapping(42);
}
