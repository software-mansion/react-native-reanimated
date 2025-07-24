import { isShareableRef, makeShareableCloneRecursive } from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('Test isShareableRef', () => {
  test('check if makeShareableCloneRecursive<number> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(1);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<object> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive({ a: 1, b: '2' });

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<string> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive('test');

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<boolean> returns shareable ref', () => {
    const trueShareableRef = makeShareableCloneRecursive(true);
    const falseShareableRef = makeShareableCloneRecursive(false);

    expect(isShareableRef(trueShareableRef)).toBe(true);
    expect(isShareableRef(falseShareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<undefined> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(undefined);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<null> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(null);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<bigint> returns shareable ref', () => {
    const shareableRef = makeShareableCloneRecursive(BigInt(123));

    expect(isShareableRef(shareableRef)).toBe(true);
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

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<Set> returns shareable ref', () => {
    const setValue = new Set([1, '1', true]);
    const shareableRef = makeShareableCloneRecursive(setValue);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<Map> returns shareable ref', () => {
    const mapValue = new Map<any, any>([
      [1, 2],
      ['1', '2'],
      [true, false],
    ]);
    const shareableRef = makeShareableCloneRecursive(mapValue);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<Error> returns shareable ref', () => {
    const errorValue = new Error('test');
    const shareableRef = makeShareableCloneRecursive(errorValue);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<RegExp> returns shareable ref', () => {
    const regExpValue = /a/;
    const shareableRef = makeShareableCloneRecursive(regExpValue);

    expect(isShareableRef(shareableRef)).toBe(true);
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

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<worklet function> returns shareable ref', () => {
    const workletFunction = () => {
      'worklet';
      return 1;
    };
    const shareableRef = makeShareableCloneRecursive(workletFunction);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<remote function> returns shareable ref', () => {
    const remoteFunction = () => 1;
    const shareableRef = makeShareableCloneRecursive(remoteFunction);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<ArrayBuffer> returns shareable ref', () => {
    const arrayBuffer = new ArrayBuffer(3);
    const shareableRef = makeShareableCloneRecursive(arrayBuffer);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<host object> returns shareable ref', () => {
    // @ts-expect-error It's ok
    const hostObjectValue = globalThis.__reanimatedModuleProxy;
    const shareableRef = makeShareableCloneRecursive(hostObjectValue);

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if makeShareableCloneRecursive<host function> returns shareable ref', () => {
    // @ts-expect-error It's ok
    const hostFunction = globalThis.__workletsModuleProxy.makeShareableBoolean;
    const shareableRef = makeShareableCloneRecursive(hostFunction);

    expect(isShareableRef(shareableRef)).toBe(true);
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

    expect(isShareableRef(shareableRef)).toBe(true);
  });

  test('check if non-shareable values return false', () => {
    expect(isShareableRef(1)).toBe(false);
    expect(isShareableRef('test')).toBe(false);
    expect(isShareableRef(true)).toBe(false);
    expect(isShareableRef(false)).toBe(false);
    expect(isShareableRef(null)).toBe(false);
    expect(isShareableRef(undefined)).toBe(false);
    expect(isShareableRef({ a: 1 })).toBe(false);
    expect(isShareableRef([1, 2, 3])).toBe(false);
    expect(isShareableRef(() => {})).toBe(false);
    expect(isShareableRef(new Set([1, 2]))).toBe(false);
    expect(isShareableRef(new Map([[1, 2]]))).toBe(false);
    expect(isShareableRef(new Error('test'))).toBe(false);
    expect(isShareableRef(/test/)).toBe(false);
    expect(isShareableRef(new ArrayBuffer(3))).toBe(false);
  });
});
