'use strict';

import type {
  FlatSerializableRef,
  RegistrationData,
  SerializableRef,
} from './types';

export function isSerializableRef<TValue = unknown>(
  value: unknown
): value is SerializableRef<TValue> {
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

export function registerCustomSerializable<
  TValue extends object,
  TPacked extends object,
>(_registrationData: RegistrationData<TValue, TPacked>) {
  // noop
}
