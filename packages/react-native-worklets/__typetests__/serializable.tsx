/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createSerializable,
  createSerializableArray,
  createSerializableArrayBuffer,
  createSerializableArrayBufferView,
  createSerializableError,
  createSerializableMap,
  createSerializableObject,
  createSerializableRegExp,
  createSerializableSet,
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
