'use strict';

import type { FlatSerializableRef, SerializableRef } from './workletTypes';

export function isSerializableRef(value: unknown): value is SerializableRef {
  return true;
}

export function createSerializable<TValue>(
  value: TValue
): SerializableRef<TValue> {
  return value as SerializableRef<TValue>;
}

export function makeShareableCloneOnUIRecursive<TValue>(
  value: TValue
): FlatSerializableRef<TValue> {
  return value as FlatSerializableRef<TValue>;
}

export function makeShareable<TValue>(value: TValue): TValue {
  return value;
}
