'use strict';

import {
  RemoteFunctionBearingEntry,
  RemoteFunctionBearingEntryKind,
  remoteFunctionBearingFlag,
} from './remoteFunctionBearingEntry';
import type { SerializableRef } from './types';

/**
 * This symbol is used to represent a mapping from the value to itself.
 *
 * It's used to prevent converting a serializable that's already converted - for
 * example a Shared Value that's in worklet's closure.
 */
export const serializableMappingFlag = Symbol('serializable flag');

/*
During a fast refresh, React holds the same instance of a Mutable
(that's guaranteed by `useRef`) but `serializableCache` gets regenerated and thus
becoming empty. This happens when editing the file that contains the definition of this cache.

Because of it, `createSerializable` can't find given mapping
in `serializableCache` for the Mutable and tries to clone it as if it was a regular JS object.
During cloning we use `Object.entries` to iterate over the keys which throws an error on accessing `_value`.
For convenience we moved this cache to a separate file so it doesn't scare us with red squiggles.
*/

/**
 * The entries as they are stored. A value maps to its clone when the clone
 * holds no JS function, and to a `RemoteFunctionBearingEntry` when it does. A
 * clone maps to `serializableMappingFlag`, or to `remoteFunctionBearingFlag`
 * when it holds a JS function, so the entries are the only record of which
 * clones hold one and a hit on any other clone costs no lookup beyond its own
 * entry. Only `serializable.native.ts`, which knows what each clone holds,
 * writes them directly.
 */
export const serializableMappingEntries = new WeakMap<
  object,
  SerializableRef | RemoteFunctionBearingEntry | symbol
>();

/**
 * Whether `serializableRef` holds a JS function: a clone recorded as one, or a
 * remote function.
 */
function isRemoteFunctionBearing(serializableRef: object) {
  return (
    serializableMappingEntries.get(serializableRef) ===
      remoteFunctionBearingFlag ||
    (typeof serializableRef === 'function' &&
      (serializableRef as { __remoteFunction?: boolean }).__remoteFunction ===
        true)
  );
}

export const serializableMappingCache = {
  set(serializable: object, serializableRef?: SerializableRef): void {
    if (!serializableRef) {
      serializableMappingEntries.set(
        serializable,
        isRemoteFunctionBearing(serializable)
          ? remoteFunctionBearingFlag
          : serializableMappingFlag
      );
    } else if (isRemoteFunctionBearing(serializableRef)) {
      serializableMappingEntries.set(
        serializable,
        new RemoteFunctionBearingEntry(
          serializableRef,
          RemoteFunctionBearingEntryKind.Strong
        )
      );
    } else {
      serializableMappingEntries.set(serializable, serializableRef);
    }
  },
  /**
   * Returns the serializable, a `WeakRef` to one (JS functions), the flag, or
   * an opaque non-owning marker (clones that hold a JS function, see
   * `cacheClone` in `serializable.native.ts`).
   */
  get(
    serializable: object
  ): SerializableRef | WeakRef<SerializableRef> | object | symbol | undefined {
    const entry = serializableMappingEntries.get(serializable);
    if (entry instanceof RemoteFunctionBearingEntry) {
      return entry.ref;
    }
    return entry === remoteFunctionBearingFlag
      ? serializableMappingFlag
      : entry;
  },
  delete(serializable: object): boolean {
    return serializableMappingEntries.delete(serializable);
  },
};
