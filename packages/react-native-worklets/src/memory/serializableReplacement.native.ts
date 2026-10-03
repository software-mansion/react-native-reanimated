'use strict';

import { createSerializable, isSerializableRef } from './serializable';
import {
  serializableMappingCache,
  serializableMappingFlag,
} from './serializableMappingCache';

export function setSerializableReplacement(
  value: object,
  replacement: unknown
): void {
  const serializableRef = isSerializableRef(replacement)
    ? replacement
    : createSerializable(replacement);
  serializableMappingCache.set(value, serializableRef);
  serializableMappingCache.set(serializableRef);
}

export function hasSerializableReplacement(value: object): boolean {
  return serializableMappingCache.get(value) !== undefined;
}

export function removeSerializableReplacement(value: object): void {
  if (serializableMappingCache.get(value) !== serializableMappingFlag) {
    serializableMappingCache.delete(value);
  }
}
