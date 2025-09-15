'use strict';

import { createSerializable } from './serializable';
import { WorkletsModule } from './WorkletsModule';
export function createSynchronizable(initialValue) {
  const synchronizableRef = WorkletsModule.createSynchronizable(createSerializable(initialValue));
  return globalThis.__synchronizableUnpacker(synchronizableRef);
}
//# sourceMappingURL=synchronizable.js.map