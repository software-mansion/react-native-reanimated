import { isSerializableRef, makeShareableCloneRecursive } from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('Test isSerializableRef', () => {
  test('check if makeShareableCloneRecursive<number> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(1);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<object> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive({ a: 1, b: '2' });

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<string> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive('test');

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<boolean> returns shareable ref', () => {
    const trueShareableRef = makeShareableCloneRecursive(true);
    const falseShareableRef = makeShareableCloneRecursive(false);

    expect(isSerializableRef(trueShareableRef)).toBe(true);
    expect(isSerializableRef(falseShareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<undefined> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(undefined);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<null> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(null);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<bigint> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(BigInt(123));

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<array> returns shareable ref', () => {
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
    const shareableRef = makeShareableCloneRecursive(arrayValue);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<Set> returns shareable ref', () => {
    const setValue = new Set([1, '1', true]);
    const shareableRef = makeShareableCloneRecursive(setValue);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<Map> returns shareable ref', () => {
    const mapValue = new Map<any, any>([
      [1, 2],
      ['1', '2'],
      [true, false],
    ]);
    const shareableRef = makeShareableCloneRecursive(mapValue);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<Error> returns shareable ref', () => {
    const errorValue = new Error('test');
    const shareableRef = makeShareableCloneRecursive(errorValue);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<RegExp> returns shareable ref', () => {
    const regExpValue = /a/;
    const shareableRef = makeShareableCloneRecursive(regExpValue);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<complex object> returns shareable ref', () => {
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
    const shareableRef = makeShareableCloneRecursive(obj);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<worklet function> returns shareable ref', () => {
    const workletFunction = () => {
      'worklet';
      return 1;
    };
    const shareableRef = makeShareableCloneRecursive(workletFunction);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<remote function> returns shareable ref', () => {
    const remoteFunction = () => 1;
    const shareableRef = makeShareableCloneRecursive(remoteFunction);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<ArrayBuffer> returns shareable ref', () => {
    const arrayBuffer = new ArrayBuffer(3);
    const shareableRef = makeShareableCloneRecursive(arrayBuffer);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<host object> returns shareable ref', () => {
    // @ts-expect-error It's ok
    const hostObjectValue = globalThis.__reanimatedModuleProxy;
    const shareableRef = makeShareableCloneRecursive(hostObjectValue);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<host function> returns shareable ref', () => {
    // @ts-expect-error It's ok
    const hostFunction = globalThis.__workletsModuleProxy.makeShareableBoolean;
    const shareableRef = makeShareableCloneRecursive(hostFunction);

    expect(isSerializableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<TurboModule-like object> returns shareable ref', () => {
    // @ts-expect-error This global host object isn't exposed in the types.
    const proto = globalThis.__reanimatedModuleProxy;
    const obj = {
      a: 1,
      b: 'test',
    };
    Object.setPrototypeOf(obj, proto);
    const shareableRef = makeShareableCloneRecursive(obj);

    expect(isSerializableRef(shareableRef)).toBe(true);
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
