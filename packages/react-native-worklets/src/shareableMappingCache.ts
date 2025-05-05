'use strict';
import { shouldBeUseWeb } from './PlatformChecker';
import type { ShareableRef } from './workletTypes';

/**
 * This symbol is used to represent a mapping from the value to itself.
 *
 * It's used to prevent converting a shareable that's already converted - for
 * example a Shared Value that's in worklet's closure.
 */
export const shareableMappingFlag = Symbol('shareable flag');

/*
During a fast refresh, React holds the same instance of a Mutable
(that's guaranteed by `useRef`) but `shareableCache` gets regenerated and thus
becoming empty. This happens when editing the file that contains the definition of this cache.

Because of it, `makeShareableCloneRecursive` can't find given mapping
in `shareableCache` for the Mutable and tries to clone it as if it was a regular JS object.
During cloning we use `Object.entries` to iterate over the keys which throws an error on accessing `_value`.
For convenience, we moved this cache to a separate file so it doesn't scare us with red squiggles.
*/

function createWebShareableMappingCache() {
  return {
    set() {
      // NOOP
    },
    get() {
      return null;
    },
  };
}

function createNativeShareableMappingCache() {
  const cache = new WeakMap<object, ShareableRef | symbol>();

  return {
    set(shareable: object, shareableRef?: ShareableRef): void {
      cache.set(shareable, shareableRef || shareableMappingFlag);
    },
    get: cache.get.bind(cache),
  };
}

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
export const shareableMappingCache = shouldBeUseWeb()
  ? createWebShareableMappingCache()
  : createNativeShareableMappingCache();
