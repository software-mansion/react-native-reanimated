/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSerializable } from '..';

export function createSerializableTypeTests() {
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
