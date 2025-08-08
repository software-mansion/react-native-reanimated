import { isSerializableRef, createSerializable } from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('Test isSerializableRef', () => {
  test('check if createSerializable<number> returns shareable ref', () => {
    const serializableRef = createSerializable(1);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<object> returns shareable ref', () => {
    const serializableRef = createSerializable({ a: 1, b: '2' });

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<string> returns shareable ref', () => {
    const serializableRef = createSerializable('test');

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<boolean> returns shareable ref', () => {
    const trueShareableRef = createSerializable(true);
    const falseShareableRef = createSerializable(false);

    expect(isSerializableRef(trueShareableRef)).toBe(true);
    expect(isSerializableRef(falseShareableRef)).toBe(true);
  });

  test('check if createSerializable<undefined> returns shareable ref', () => {
    const serializableRef = createSerializable(undefined);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<null> returns shareable ref', () => {
    const serializableRef = createSerializable(null);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<bigint> returns shareable ref', () => {
    const serializableRef = createSerializable(BigInt(123));

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<array> returns shareable ref', () => {
    const arrayValue = [
      1,
      true,
      false,
      null,
      undefined,
      'a',
      BigInt(123),
      { a: 1 },
      () => 1,
      [1],
      () => {
        'worklet';
        return 1;
      },
      /a/,
      new ArrayBuffer(3),
    ];
    const serializableRef = createSerializable(arrayValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<Set> returns shareable ref', () => {
    const setValue = new Set([1, '1', true]);
    const serializableRef = createSerializable(setValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<Map> returns shareable ref', () => {
    const mapValue = new Map<any, any>([
      [1, 2],
      ['1', '2'],
      [true, false],
    ]);
    const serializableRef = createSerializable(mapValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<Error> returns shareable ref', () => {
    const errorValue = new Error('test');
    const serializableRef = createSerializable(errorValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<RegExp> returns shareable ref', () => {
    const regExpValue = /a/;
    const serializableRef = createSerializable(regExpValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<complex object> returns shareable ref', () => {
    const obj = {
      number: 1,
      true: true,
      false: false,
      null: null,
      undefined: undefined,
      string: 'test',
      bigint: BigInt(123),
      object: { f: 4, g: 'test' },
      remoteFunction: () => 1,
      array: [1],
      workletFunction: () => {
        'worklet';
        return 2;
      },
      initializer: /test/,
      arrayBuffer: new ArrayBuffer(3),
    };
    const serializableRef = createSerializable(obj);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<worklet function> returns shareable ref', () => {
    const workletFunction = () => {
      'worklet';
      return 1;
    };
    const serializableRef = createSerializable(workletFunction);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<remote function> returns shareable ref', () => {
    const remoteFunction = () => 1;
    const serializableRef = createSerializable(remoteFunction);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<ArrayBuffer> returns shareable ref', () => {
    const arrayBuffer = new ArrayBuffer(3);
    const serializableRef = createSerializable(arrayBuffer);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<host object> returns shareable ref', () => {
    // @ts-expect-error It's ok
    const hostObjectValue = globalThis.__reanimatedModuleProxy;
    const serializableRef = createSerializable(hostObjectValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<host function> returns shareable ref', () => {
    // @ts-expect-error It's ok
    const hostFunction = globalThis.__workletsModuleProxy.makeShareableBoolean;
    const serializableRef = createSerializable(hostFunction);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<TurboModule-like object> returns shareable ref', () => {
    // @ts-expect-error This global host object isn't exposed in the types.
    const proto = globalThis.__reanimatedModuleProxy;
    const obj = {
      a: 1,
      b: 'test',
    };
    Object.setPrototypeOf(obj, proto);
    const serializableRef = createSerializable(obj);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if non-shareable values return false', () => {
    expect(isSerializableRef(1)).toBe(false);
    expect(isSerializableRef('test')).toBe(false);
    expect(isSerializableRef(true)).toBe(false);
    expect(isSerializableRef(false)).toBe(false);
    expect(isSerializableRef(null)).toBe(false);
    expect(isSerializableRef(undefined)).toBe(false);
    expect(isSerializableRef({ a: 1 })).toBe(false);
    expect(isSerializableRef([1, 2, 3])).toBe(false);
    expect(isSerializableRef(() => {})).toBe(false);
    expect(isSerializableRef(new Set([1, 2]))).toBe(false);
    expect(isSerializableRef(new Map([[1, 2]]))).toBe(false);
    expect(isSerializableRef(new Error('test'))).toBe(false);
    expect(isSerializableRef(/test/)).toBe(false);
    expect(isSerializableRef(new ArrayBuffer(3))).toBe(false);
  });
});
