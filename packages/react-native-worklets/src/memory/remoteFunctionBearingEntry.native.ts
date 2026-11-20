'use strict';

import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import type { SerializableRef } from './types';

/**
 * Like `serializableMappingFlag`, for a clone whose subtree holds a JS
 * (non-worklet) function. Such a clone owns, through C++, a remote function
 * that holds the JS function strongly, as a root the garbage collector cannot
 * trace through. If the cache owned the clone, a JS function whose closure
 * reaches the cache key (for example a `runOnJS` callback that captures the
 * worklet calling it) would close a cycle that no garbage collector can see,
 * even if the clone never leaves the React Native runtime, and leak everything
 * the closure reaches. So the cache holds such a clone through a
 * `RemoteFunctionBearingEntry`, and only owns it when it is persisted.
 */
export const remoteFunctionBearingFlag = Symbol(
  'remote-function-bearing serializable flag'
);

export enum RemoteFunctionBearingEntryKind {
  /** `ref` is the clone, owned by the cache. */
  Strong,
  /** `ref` is a `WeakRef` to the clone of a JS function. */
  WeakRef,
  /** `ref` is a non-owning marker made by `makeWeakSerializableRef`. */
  Marker,
}

/** The cache entry of a value whose clone holds a JS function. */
export class RemoteFunctionBearingEntry {
  /**
   * Never a serializable. A cache hit reads `__serializableRef` once to tell a
   * stored serializable (`true`) from this entry (`false`), which costs less on
   * Hermes than `instanceof`.
   */
  readonly __serializableRef = false;

  /**
   * For a `Marker`, where `WeakRef` exists, the clone that was cached or that
   * the last call to native returned. A live clone owns its native
   * serializable, so a hit can return it without a call to native, and the
   * `WeakRef` does not keep it alive.
   */
  wrapper: WeakRef<object> | undefined = undefined;

  constructor(
    readonly ref: object,
    readonly kind: RemoteFunctionBearingEntryKind
  ) {}

  /**
   * The entry for `value -> clone` where the clone holds a JS function. A
   * persisted clone is owned by the cache. Any other is held through a
   * non-owning marker, so the cache never keeps it alive on its own.
   */
  static forClone(
    clone: SerializableRef<unknown>,
    shouldPersistRemote: boolean
  ): RemoteFunctionBearingEntry {
    if (shouldPersistRemote) {
      return new RemoteFunctionBearingEntry(
        clone,
        RemoteFunctionBearingEntryKind.Strong
      );
    }
    const entry = new RemoteFunctionBearingEntry(
      WorkletsModule.makeWeakSerializableRef(clone),
      RemoteFunctionBearingEntryKind.Marker
    );
    if (globalThis.WeakRef) {
      entry.wrapper = new WeakRef(clone);
    }
    return entry;
  }

  /**
   * The entry for `fun -> clone` where the clone is the remote function of
   * `fun`. Requires `WeakRef`, which is installed on runtimes only with Hermes
   * microtaskQueue enabled.
   */
  static forRemoteFunction(
    clone: SerializableRef<unknown>
  ): RemoteFunctionBearingEntry {
    return new RemoteFunctionBearingEntry(
      new WeakRef(clone),
      RemoteFunctionBearingEntryKind.WeakRef
    );
  }

  /**
   * The clone this entry stands for, or `undefined` once it was released. A
   * `Marker` first tries the clone returned before, which owns the native
   * serializable while it lives, and only then asks native for a new reference.
   * `onRevived` receives a clone that native just created, so the caller can
   * record what it holds.
   */
  deref(onRevived: (clone: object) => void): object | undefined {
    if (this.kind === RemoteFunctionBearingEntryKind.Marker) {
      const wrapper = this.wrapper?.deref();
      if (wrapper !== undefined) {
        return wrapper;
      }
      const live = WorkletsModule.derefWeakSerializableRef(this.ref);
      if (live !== undefined) {
        onRevived(live);
        if (globalThis.WeakRef) {
          this.wrapper = new WeakRef(live);
        }
      }
      // When the clone was released, the caller serializes the value again and
      // replaces the entry.
      return live;
    }
    if (this.kind === RemoteFunctionBearingEntryKind.WeakRef) {
      return (this.ref as WeakRef<object>).deref();
    }
    return this.ref;
  }
}
