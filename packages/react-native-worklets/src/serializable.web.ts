'use strict';

export function isSerializableRef(): boolean {
  return true;
}

export function createSerializable<TValue>(value: TValue): TValue {
  return value;
}

export function makeShareableCloneOnUIRecursive<TValue>(value: TValue): TValue {
  return value;
}

export function makeShareable<TValue>(value: TValue): TValue {
  return value;
}
