'use strict';

import { createSerializable } from './memory/serializable';
import { serializableMappingCache } from './memory/serializableMappingCache';

export function addGuardImplementation<Args extends unknown[]>(
  fn: (...args: Args) => unknown,
  errorMessage: string
): void {
  const serializableGuard = createSerializable(function guardImplementation() {
    'worklet';
    throw new Error(`[Worklets] ${errorMessage}`);
  });
  serializableMappingCache.set(fn, serializableGuard);
}

export function addNoBundleModeGuardImplementation<Args extends unknown[]>(
  fn: (...args: Args) => unknown
): void {
  const name = fn.name;

  addGuardImplementation(
    fn,
    `${name} cannot be called on Worklet Runtimes outside of the Bundle Mode.`
  );
}
