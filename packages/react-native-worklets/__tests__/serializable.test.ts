import { createSerializable } from '../src/memory/serializable';

jest.mock('../src/WorkletsModule/NativeWorklets', () => {
  const mockSerializable = (value: unknown) => ({
    __serializableRef: true,
    value,
  });
  return {
    WorkletsModule: {
      createSerializableString: mockSerializable,
      createSerializableNumber: mockSerializable,
      createSerializableBoolean: mockSerializable,
      createSerializableBigInt: mockSerializable,
      createSerializableUndefined: mockSerializable,
      createSerializableNull: mockSerializable,
      createSerializableArray: mockSerializable,
      createSerializableObject: mockSerializable,
      createSerializableMap: mockSerializable,
      createSerializableSet: mockSerializable,
    },
  };
});

class Clazz {}

function setDev(value: boolean) {
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = value;
}

describe('createSerializable unsupported-type warning', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    setDev(true);
    jest.restoreAllMocks();
  });

  test('warns without a location for a top-level unsupported value', () => {
    createSerializable(new Clazz());

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`.'
    );
  });

  test('includes the property path for a value nested in an object', () => {
    createSerializable({ a: { b: new Clazz() } });

    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`. It was located at `["a"]["b"]`.'
    );
  });

  test('includes the index path for a value nested in an array', () => {
    createSerializable([1, [new Clazz()]]);

    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`. It was located at `[1][0]`.'
    );
  });

  test('includes the map value path', () => {
    createSerializable(new Map([[0, new Clazz()]]));

    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`. It was located at `.values()[0]`.'
    );
  });

  test('includes the map key path', () => {
    createSerializable(new Map([[new Clazz(), 1]]));

    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`. It was located at `.keys()[0]`.'
    );
  });

  test('includes the set value path', () => {
    createSerializable(new Set([new Clazz()]));

    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`. It was located at `.values()[0]`.'
    );
  });

  test('reconstructs the full path through a Map -> array -> object', () => {
    createSerializable(new Map([[0, [{ someKey: new Clazz() }]]]));

    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`. It was located at `.values()[0][0]["someKey"]`.'
    );
  });

  test('keeps the path stack balanced after a thrown error', () => {
    const cyclic: unknown[] = [];
    cyclic.push(cyclic);

    expect(() => createSerializable(cyclic)).toThrow(
      'Trying to convert a cyclic object'
    );

    createSerializable({ onlyKey: new Clazz() });

    expect(console.warn).toHaveBeenCalledWith(
      '[Worklets] Cannot copy value of type `Clazz`. It was located at `["onlyKey"]`.'
    );
  });

  test('does not warn outside dev', () => {
    setDev(false);

    createSerializable(new Clazz());

    expect(console.warn).not.toHaveBeenCalled();
  });
});
