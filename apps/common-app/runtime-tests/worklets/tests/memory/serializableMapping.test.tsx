import {
  createSerializable,
  getSerializableMapping,
  hasSerializableMapping,
  isSerializableRef,
  removeSerializableMapping,
  runOnRuntimeAsyncWithId,
  setSerializableMapping,
  UIRuntimeId,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

describe('Test serializable mapping', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const runtimes = [
    { name: 'UI', runtimeId: UIRuntimeId },
    { name: 'Worker', runtimeId: workletRuntime.runtimeId },
  ];

  runtimes.forEach(({ name, runtimeId }) => {
    describe(`on ${name} Runtime`, () => {
      test('sends the mapping in place of the object', async () => {
        const flag = { current: false };
        setSerializableMapping(flag, { current: true });

        const current = await runOnRuntimeAsyncWithId(runtimeId, () => {
          'worklet';
          return flag.current;
        });

        expect(current).toBe(true);
      });

      test('overwrites the mapping created by an earlier serialization', async () => {
        const flag = { current: false };
        const before = await runOnRuntimeAsyncWithId(runtimeId, () => {
          'worklet';
          return flag.current;
        });
        setSerializableMapping(flag, { current: true });

        const after = await runOnRuntimeAsyncWithId(runtimeId, () => {
          'worklet';
          return flag.current;
        });

        expect(before).toBe(false);
        expect(after).toBe(true);
      });

      test('sends the object itself after the mapping is removed', async () => {
        const flag = { current: false };
        setSerializableMapping(flag, { current: true });
        removeSerializableMapping(flag);

        const current = await runOnRuntimeAsyncWithId(runtimeId, () => {
          'worklet';
          return flag.current;
        });

        expect(current).toBe(false);
      });
    });
  });

  test('has no mapping for an object that was never serialized', () => {
    const value = {};

    expect(hasSerializableMapping(value)).toBe(false);
    expect(getSerializableMapping(value) === undefined).toBe(true);
  });

  test('returns the mapping set with setSerializableMapping', () => {
    const value = {};
    const mapping = createSerializable({ current: true });
    setSerializableMapping(value, mapping);

    expect(hasSerializableMapping(value)).toBe(true);
    expect(getSerializableMapping(value) === mapping).toBe(true);
  });

  test('serializes a mapping that is not a SerializableRef', () => {
    const value = {};
    setSerializableMapping(value, { current: true });

    expect(isSerializableRef(getSerializableMapping(value))).toBe(true);
  });

  test('returns the clone cached by createSerializable', () => {
    const value = { a: 1 };
    const clone = createSerializable(value);

    expect(hasSerializableMapping(value)).toBe(true);
    expect(getSerializableMapping(value) === clone).toBe(true);
  });

  test('returns the clone of a non-worklet function', () => {
    const fun = () => {};
    const clone = createSerializable(fun);

    expect(hasSerializableMapping(fun)).toBe(true);
    expect(getSerializableMapping(fun) === clone).toBe(true);
  });

  test('maps a SerializableRef of an object to itself', () => {
    const ref = createSerializable({ a: 1 });

    expect(getSerializableMapping(ref) === ref).toBe(true);
  });

  test('has no mapping for a SerializableRef of a primitive', () => {
    const ref = createSerializable(42);

    expect(hasSerializableMapping(ref)).toBe(false);
    expect(getSerializableMapping(ref) === undefined).toBe(true);
  });

  test('keeps the self-mapping of a SerializableRef on remove', () => {
    const ref = createSerializable({ a: 1 });
    removeSerializableMapping(ref);

    expect(getSerializableMapping(ref) === ref).toBe(true);
  });

  test('removes the mapping', () => {
    const value = {};
    setSerializableMapping(value, { current: true });
    removeSerializableMapping(value);

    expect(hasSerializableMapping(value)).toBe(false);
  });
});
