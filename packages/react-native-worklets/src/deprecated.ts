'use strict';

import type { CreateSerializable } from './shareables';
import {
  createSerializable,
  createSerializableOnUIRecursive,
  createSerializableRecursive,
} from './shareables';
import type { SerializableRef } from './workletTypes';

/** @deprecated Use SerializableRef instead. */
export type ShareableRef = SerializableRef;

/** @deprecated Use createSerializable instead. */
export const makeShareable = createSerializable;

/** @deprecated Use createSerializableOnUIRecursive instead. */
export const makeShareableCloneOnUIRecursive = createSerializableOnUIRecursive;

/** @deprecated Use createSerializableRecursive instead. */
export const makeShareableCloneRecursive = createSerializableRecursive;

/** @deprecated Use CreateSerializable instead. */
export type MakeShareableClone = CreateSerializable;
