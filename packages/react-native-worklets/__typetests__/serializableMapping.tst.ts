import { describe, expect, test } from 'tstyche';

import {
  createSerializable,
  getSerializableMapping,
  hasSerializableMapping,
  removeSerializableMapping,
  type SerializableRef,
  setSerializableMapping,
} from '..';

describe('setSerializableMapping', () => {
  test('accepts an object and any mapping', () => {
    expect(setSerializableMapping).type.toBeCallableWith(
      { current: false },
      { current: true }
    );
    expect(setSerializableMapping).type.toBeCallableWith(() => {}, 42);
    expect(setSerializableMapping).type.toBeCallableWith(
      {},
      createSerializable({ current: true })
    );
  });

  test('rejects a primitive value', () => {
    expect(setSerializableMapping).type.not.toBeCallableWith(42, 43);
  });

  test('requires a mapping', () => {
    expect(setSerializableMapping).type.not.toBeCallableWith({});
  });

  test('returns void', () => {
    expect(setSerializableMapping({}, 42)).type.toBe<void>();
  });
});

describe('getSerializableMapping', () => {
  test('returns a SerializableRef or undefined', () => {
    expect(getSerializableMapping({})).type.toBe<
      SerializableRef | undefined
    >();
  });

  test('rejects a primitive value', () => {
    expect(getSerializableMapping).type.not.toBeCallableWith(42);
  });
});

describe('hasSerializableMapping', () => {
  test('returns a boolean', () => {
    expect(hasSerializableMapping({})).type.toBe<boolean>();
  });

  test('rejects a primitive value', () => {
    expect(hasSerializableMapping).type.not.toBeCallableWith(42);
  });
});

describe('removeSerializableMapping', () => {
  test('returns void', () => {
    expect(removeSerializableMapping({})).type.toBe<void>();
  });

  test('rejects a primitive value', () => {
    expect(removeSerializableMapping).type.not.toBeCallableWith(42);
  });
});
