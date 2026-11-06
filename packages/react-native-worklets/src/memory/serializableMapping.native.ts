'use strict';

import {
  createSerializable,
  getCachedSerializable,
  isSerializableRef,
} from './serializable';
import {
  serializableMappingCache,
  serializableMappingFlag,
} from './serializableMappingCache';
import type { SerializableRef } from './types';

export function setSerializableMapping(value: object, mapping: unknown): void {
  const serializableRef = isSerializableRef(mapping)
    ? mapping
    : createSerializable(mapping);
  serializableMappingCache.set(value, serializableRef);
  serializableMappingCache.set(serializableRef);
}

export function getSerializableMapping(
  value: object
): SerializableRef | undefined {
  return getCachedSerializable(value);
}

export function hasSerializableMapping(value: object): boolean {
  return getSerializableMapping(value) !== undefined;
}

export function removeSerializableMapping(value: object): void {
  if (serializableMappingCache.get(value) !== serializableMappingFlag) {
    serializableMappingCache.delete(value);
  }
}
