/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createSerializable,
  createSerializableArray,
  createSerializableArrayBuffer,
  createSerializableArrayBufferView,
  createSerializableBigInt,
  createSerializableBoolean,
  createSerializableError,
  createSerializableMap,
  createSerializableNull,
  createSerializableNumber,
  createSerializableObject,
  createSerializableRegExp,
  createSerializableRemoteFunction,
  createSerializableSet,
  createSerializableString,
  createSerializableUndefined,
  createSerializableWorklet,
} from '..';

function createSerializableTypeTests() {
  const serializable0 = createSerializable(0);
  const serializable1 = createSerializable(true);
  const serializable2 = createSerializable(null);
  const serializable3 = createSerializable(undefined);
  const serializable4 = createSerializable({ foo: 'bar' });
  const serializable5 = createSerializable(new Set([1, 2, 3]));
  const serializable6 = createSerializable(new Map([['foo', 'bar']]));
  const serializable7 = createSerializable([1, 2, 3]);
  const serializable8 = createSerializable(new RegExp('test'));
  const serializable9 = createSerializable(new ArrayBuffer(8));
}

function createSerializableTypedTypeTests() {
  const array = createSerializableArray([1, 2, 3]);
  const object = createSerializableObject({ foo: 'bar' });
  const map = createSerializableMap(new Map([['foo', 'bar']]));
  const set = createSerializableSet(new Set([1, 2, 3]));
  const error = createSerializableError(new TypeError('test'));
  const regExp = createSerializableRegExp(/test/);
  const arrayBuffer = createSerializableArrayBuffer(new ArrayBuffer(8));
  const arrayBufferView = createSerializableArrayBufferView(new Uint8Array(8));
  // @ts-expect-error Only arrays are accepted.
  createSerializableArray(new Set([1]));
  // @ts-expect-error Only Maps are accepted.
  createSerializableMap(new Set([1]));
  // @ts-expect-error Only Sets are accepted.
  createSerializableSet([1]);
  // @ts-expect-error Only Errors are accepted.
  createSerializableError({ message: 'test' });
  // @ts-expect-error Only RegExps are accepted.
  createSerializableRegExp('test');
  // @ts-expect-error Only ArrayBuffers are accepted.
  createSerializableArrayBuffer(new Uint8Array(8));
  // @ts-expect-error Only ArrayBuffer views are accepted.
  createSerializableArrayBufferView(new ArrayBuffer(8));
  // @ts-expect-error Primitives aren't accepted.
  createSerializableObject(42);
}

function createSerializableTypedPrimitiveTypeTests() {
  const string = createSerializableString('foo');
  const number = createSerializableNumber(42);
  const boolean = createSerializableBoolean(true);
  const bigInt = createSerializableBigInt(BigInt(42));
  const nullValue = createSerializableNull(null);
  const undefinedValue = createSerializableUndefined(undefined);
  // @ts-expect-error Only strings are accepted.
  createSerializableString(42);
  // @ts-expect-error Only numbers are accepted.
  createSerializableNumber('42');
  // @ts-expect-error Only booleans are accepted.
  createSerializableBoolean(1);
  // @ts-expect-error Only bigints are accepted.
  createSerializableBigInt(42);
  // @ts-expect-error Only null is accepted.
  createSerializableNull(undefined);
  // @ts-expect-error Only undefined is accepted.
  createSerializableUndefined(null);
}

function createSerializableTypedFunctionTypeTests() {
  const worklet = createSerializableWorklet((a: number) => {
    'worklet';
    return a + 1;
  });
  const remoteFunction = createSerializableRemoteFunction((a: number) => a + 1);
  // @ts-expect-error Only functions are accepted.
  createSerializableWorklet({ foo: 'bar' });
  // @ts-expect-error Only functions are accepted.
  createSerializableRemoteFunction(42);
}
