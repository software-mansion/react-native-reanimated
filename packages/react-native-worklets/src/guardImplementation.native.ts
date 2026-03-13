'use strict';

import { WorkletsError } from './debug/WorkletsError';
import { createSerializable } from './memory/serializable';
import { serializableMappingCache } from './memory/serializableMappingCache';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function addGuardImplementation(fn: Function): void {
  const name = fn.name;
  const serializableGuard = createSerializable(function guardImplementation() {
    'worklet';
    throw new WorkletsError(
      `${name} cannot be called on Worklet Runtimes outside of the Bundle Mode.`
    );
  });
  serializableMappingCache.set(fn, serializableGuard);
}
