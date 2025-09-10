'use strict';

import { SHOULD_BE_USE_WEB } from "./PlatformChecker/index.js";
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

const cache = SHOULD_BE_USE_WEB ? null : new WeakMap();
export const serializableMappingCache = SHOULD_BE_USE_WEB ? {
  set() {
    // NOOP
  },
  get() {
    return null;
  }
} : {
  set(serializable, serializableRef) {
    cache.set(serializable, serializableRef || serializableMappingFlag);
  },
  get: cache.get.bind(cache)
};
//# sourceMappingURL=serializableMappingCache.js.map