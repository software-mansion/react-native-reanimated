'use strict';

import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { createSerializable } from './serializable';
import type { Synchronizable } from './types';

export function createSynchronizable<TValue = unknown>(
  initialValue: TValue
): Synchronizable<TValue> {
  const synchronizableRef = WorkletsModule.createSynchronizable(
    createSerializable(initialValue)
  );

  return globalThis.__synchronizableUnpacker(
    synchronizableRef
  ) as unknown as Synchronizable<TValue>;
}
