'use strict';

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
 * Like `serializableMappingFlag`, for a clone whose subtree holds a JS
 * (non-worklet) function. Such a clone owns, through C++, a remote function
 * that holds the JS function strongly. Once the clone reaches another runtime,
 * its copy there is retained for as long as the clone lives. If the cache owned
 * the clone, a JS function whose closure reaches the cache key (for example a
 * `runOnJS` callback that captures the worklet calling it) would close a cycle
 * across both runtimes that no garbage collector can see, and leak everything
 * the closure reaches. So the cache holds such a clone through a
 * `RemoteBearingEntry`, and only owns it when it is persisted.
 */
export const remoteBearingFlag = Symbol('remote-bearing serializable flag');

export enum RemoteBearingEntryKind {
  /** `ref` is the clone, owned by the cache. */
  Strong,
  /** `ref` is a `WeakRef` to the clone of a JS function. */
  WeakRef,
  /** `ref` is a non-owning marker made by `makeWeakSerializableRef`. */
  Marker,
}

/** The cache entry of a value whose clone holds a JS function. */
export class RemoteBearingEntry {
  /**
   * Never a serializable. A cache hit reads `__serializableRef` once to tell a
   * stored serializable (`true`) from this entry (`false`), which costs less on
   * Hermes than `instanceof`.
   */
  readonly __serializableRef = false;

  constructor(
    readonly ref: object,
    readonly kind: RemoteBearingEntryKind
  ) {}
}

/**
 * The entries as they are stored. A value maps to its clone when the clone
 * holds no JS function, and to a `RemoteBearingEntry` when it does. A clone
 * maps to `serializableMappingFlag`, or to `remoteBearingFlag` when it holds a
 * JS function, so the entries are the only record of which clones hold one and
 * a hit on any other clone costs no lookup beyond its own entry. Only
 * `serializable.native.ts`, which knows what each clone holds, writes them
 * directly.
 */
export const serializableMappingEntries = new WeakMap<
  object,
  SerializableRef | RemoteBearingEntry | symbol
>();

/**
 * Whether `serializableRef` holds a JS function: a clone recorded as one, or a
 * remote function.
 */
function isRemoteBearing(serializableRef: object) {
  return (
    serializableMappingEntries.get(serializableRef) === remoteBearingFlag ||
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
        isRemoteBearing(serializable)
          ? remoteBearingFlag
          : serializableMappingFlag
      );
    } else if (isRemoteBearing(serializableRef)) {
      serializableMappingEntries.set(
        serializable,
        new RemoteBearingEntry(serializableRef, RemoteBearingEntryKind.Strong)
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
    if (entry instanceof RemoteBearingEntry) {
      return entry.ref;
    }
    return entry === remoteBearingFlag ? serializableMappingFlag : entry;
  },
};
