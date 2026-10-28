'use strict';

import type {
  FlatSerializableRef,
  RegistrationData,
  SerializableRef,
} from './types';

export function isSerializableRef<TValue = unknown>(
  _value: unknown
): _value is SerializableRef<TValue> {
  return true;
}

export function createSerializable<TValue>(
  value: TValue
): SerializableRef<TValue> {
  return value as SerializableRef<TValue>;
}

export function createSerializableArray<TValue extends unknown[]>(
  value: TValue
): SerializableRef<TValue> {
  return createSerializable(value);
}

export function createSerializableObject<TValue extends object>(
  value: TValue
): SerializableRef<TValue> {
  return createSerializable(value);
}

export function createSerializableMap<TKey, TValue>(
  value: Map<TKey, TValue>
): SerializableRef<Map<TKey, TValue>> {
  return createSerializable(value);
}

export function createSerializableSet<TValue>(
  value: Set<TValue>
): SerializableRef<Set<TValue>> {
  return createSerializable(value);
}

export function createSerializableError<TValue extends Error>(
  value: TValue
): SerializableRef<TValue> {
  return createSerializable(value);
}

export function createSerializableRegExp(
  value: RegExp
): SerializableRef<RegExp> {
  return createSerializable(value);
}

export function createSerializableArrayBuffer(
  value: ArrayBuffer
): SerializableRef<ArrayBuffer> {
  return createSerializable(value);
}

export function createSerializableArrayBufferView<
  TValue extends ArrayBufferView,
>(value: TValue): SerializableRef<TValue> {
  return createSerializable(value);
}

export function createSerializableHostObject<TValue extends object>(
  value: TValue
): SerializableRef<TValue> {
  return createSerializable(value);
}

export function createSerializableString(
  value: string
): SerializableRef<string> {
  return createSerializable(value);
}

export function createSerializableNumber(
  value: number
): SerializableRef<number> {
  return createSerializable(value);
}

export function createSerializableBoolean(
  value: boolean
): SerializableRef<boolean> {
  return createSerializable(value);
}

export function createSerializableBigInt(
  value: bigint
): SerializableRef<bigint> {
  return createSerializable(value);
}

export function createSerializableNull(value: null): SerializableRef<null> {
  return createSerializable(value);
}

export function createSerializableUndefined(
  value: undefined
): SerializableRef<undefined> {
  return createSerializable(value);
}

export function createSerializableWorklet<
  TValue extends (...args: never[]) => unknown,
>(value: TValue): SerializableRef<TValue> {
  return createSerializable(value);
}

export function createSerializableRemoteFunction<
  TValue extends (...args: never[]) => unknown,
>(value: TValue): SerializableRef<TValue> {
  return createSerializable(value);
}

export function makeShareableCloneOnUIRecursive<TValue>(
  value: TValue
): FlatSerializableRef<TValue> {
  return value as FlatSerializableRef<TValue>;
}

export function makeShareable<TValue>(value: TValue): TValue {
  return value;
}

export function registerCustomSerializable<
  TValue extends object,
  TPacked extends object,
>(_registrationData: RegistrationData<TValue, TPacked>) {
  // noop
}
