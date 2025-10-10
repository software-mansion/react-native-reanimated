'use strict';

import { createSerializable } from '../serializable/serializable';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import type { Synchronizable } from './types';

export function createSynchronizable<TValue>(
  initialValue: TValue
): Synchronizable<TValue> {
  const synchronizableRef = WorkletsModule.createSynchronizable(
    createSerializable(initialValue)
  );

  return globalThis.__synchronizableUnpacker(
    synchronizableRef
  ) as unknown as Synchronizable<TValue>;
}
