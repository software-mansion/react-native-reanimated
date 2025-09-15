'use strict';

import { createSerializable, isSerializableRef, makeShareable, makeShareableCloneOnUIRecursive } from './serializable';
import { serializableMappingCache } from './serializableMappingCache';

/** @deprecated Use {@link SerializableRef} instead. */

export { makeShareable, makeShareableCloneOnUIRecursive };

/** @deprecated It will be removed in the next major version. */

/** @deprecated Use {@link createSerializable} instead. */
export const makeShareableCloneRecursive = createSerializable;

/** @deprecated Use {@link isSerializableRef} instead. */
export const isShareableRef = isSerializableRef;

/** @deprecated Use {@link serializableMappingCache} instead. */
export const shareableMappingCache = serializableMappingCache;
//# sourceMappingURL=deprecated.js.map