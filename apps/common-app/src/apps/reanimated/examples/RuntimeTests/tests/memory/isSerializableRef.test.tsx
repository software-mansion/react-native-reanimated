import { isSerializableRef, createSerializable } from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('Test isSerializableRef', () => {
  test('check if createSerializable<number> returns serializable ref', () => {
    const serializableRef = createSerializable(1);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<object> returns serializable ref', () => {
    const serializableRef = createSerializable({ a: 1, b: '2' });

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<string> returns serializable ref', () => {
    const serializableRef = createSerializable('test');

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<boolean> returns serializable ref', () => {
    const trueSerializableRef = createSerializable(true);
    const falseSerializableRef = createSerializable(false);

    expect(isSerializableRef(trueSerializableRef)).toBe(true);
    expect(isSerializableRef(falseSerializableRef)).toBe(true);
  });

  test('check if createSerializable<undefined> returns serializable ref', () => {
    const serializableRef = createSerializable(undefined);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<null> returns serializable ref', () => {
    const serializableRef = createSerializable(null);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<bigint> returns serializable ref', () => {
    const serializableRef = createSerializable(BigInt(123));

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<array> returns serializable ref', () => {
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

  test('check if createSerializable<Set> returns serializable ref', () => {
    const setValue = new Set([1, '1', true]);
    const serializableRef = createSerializable(setValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<Map> returns serializable ref', () => {
    const mapValue = new Map<any, any>([
      [1, 2],
      ['1', '2'],
      [true, false],
    ]);
    const serializableRef = createSerializable(mapValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<Error> returns serializable ref', () => {
    const errorValue = new Error('test');
    const serializableRef = createSerializable(errorValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<RegExp> returns serializable ref', () => {
    const regExpValue = /a/;
    const serializableRef = createSerializable(regExpValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<complex object> returns serializable ref', () => {
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

  test('check if createSerializable<worklet function> returns serializable ref', () => {
    const workletFunction = () => {
      'worklet';
      return 1;
    };
    const serializableRef = createSerializable(workletFunction);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<remote function> returns serializable ref', () => {
    const remoteFunction = () => 1;
    const serializableRef = createSerializable(remoteFunction);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<ArrayBuffer> returns serializable ref', () => {
    const arrayBuffer = new ArrayBuffer(3);
    const serializableRef = createSerializable(arrayBuffer);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<host object> returns serializable ref', () => {
    // @ts-ignore
    const hostObjectValue = globalThis.__reanimatedModuleProxy;
    const serializableRef = createSerializable(hostObjectValue);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<host function> returns serializable ref', () => {
    // @ts-ignore
    const hostFunction = globalThis.__workletsModuleProxy.createSerializableBoolean;
    const serializableRef = createSerializable(hostFunction);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if createSerializable<TurboModule-like object> returns serializable ref', () => {
    // @ts-ignore
    const proto = globalThis.__reanimatedModuleProxy;
    const obj = {
      a: 1,
      b: 'test',
    };
    Object.setPrototypeOf(obj, proto);
    const serializableRef = createSerializable(obj);

    expect(isSerializableRef(serializableRef)).toBe(true);
  });

  test('check if non-serializable values return false', () => {
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
