'use strict';
import type { ShareableRef } from './commonTypes';

/*
During a fast refresh, React holds the same instance of a Mutable
(that's guaranteed by `useRef`) but `shareableCache` gets regenerated and thus
becoming empty. This happens when editing the file that contains the definition of this cache.

Because of it, `makeShareableCloneRecursive` can't find given mapping
in `shareableCache` for a Mutable and tries to clone it as if it was a regular JS object.
There we use Object.entries to iterate over the keys which throws an error on accessing `_value`.
For convenience we move this cache to a separate file so it doesn't scare us with red squiggles.
*/

export const shareableCache = new WeakMap<object, ShareableRef | symbol>();
