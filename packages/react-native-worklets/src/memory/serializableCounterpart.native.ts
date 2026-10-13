'use strict';

import { createSerializable, isSerializableRef } from './serializable';
import {
  serializableMappingCache,
  serializableMappingFlag,
} from './serializableMappingCache';

export function setSerializableCounterpart(
  value: object,
  counterpart: unknown
): void {
  const serializableRef = isSerializableRef(counterpart)
    ? counterpart
    : createSerializable(counterpart);
  serializableMappingCache.set(value, serializableRef);
  serializableMappingCache.set(serializableRef);
}

export function hasSerializableCounterpart(value: object): boolean {
  const cached = serializableMappingCache.get(value);
  if (globalThis.WeakRef && cached instanceof WeakRef) {
    return cached.deref() !== undefined;
  }
  return cached !== undefined;
}

export function removeSerializableCounterpart(value: object): void {
  if (serializableMappingCache.get(value) !== serializableMappingFlag) {
    serializableMappingCache.delete(value);
  }
}
