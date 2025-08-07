'use strict';

import { serializableMappingCache } from './shareableMappingCache';
import {
  createSerializable,
  isSerializableRef,
  makeShareable,
  makeShareableCloneOnUIRecursive,
} from './shareables';
import type { SerializableRef } from './workletTypes';

/** @deprecated Use {@link SerializableRef} instead. */
export type ShareableRef<T> = SerializableRef<T>;

export { makeShareable, makeShareableCloneOnUIRecursive };

/** @deprecated Use {@link createSerializable} instead. */
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
