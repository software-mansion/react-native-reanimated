'use strict';

import {
  createSerializable,
  isSerializableRef,
  makeShareable,
  makeShareableCloneOnUIRecursive,
} from './serializable/serializable';
import { serializableMappingCache } from './serializable/serializableMappingCache';
import type { SerializableRef } from './serializable/types';

/** @deprecated Use {@link SerializableRef} instead. */
export type ShareableRef<T> = SerializableRef<T>;

export { makeShareable, makeShareableCloneOnUIRecursive };

/** @deprecated It will be removed in the next major version. */
export type MakeShareableClone = <T>(
  value: T,
  shouldPersistRemote?: boolean,
  depth?: number
) => ShareableRef<T>;

/** @deprecated Use {@link createSerializable} instead. */
export const makeShareableCloneRecursive: MakeShareableClone =
  createSerializable;

/** @deprecated Use {@link isSerializableRef} instead. */
export const isShareableRef = isSerializableRef;

/** @deprecated Use {@link serializableMappingCache} instead. */
export const shareableMappingCache = serializableMappingCache;
