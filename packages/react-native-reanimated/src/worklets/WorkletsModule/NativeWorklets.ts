'use strict';

import type { IWorkletsModule } from '../../commonTypes';

export function createNativeWorkletsModule(): IWorkletsModule {
  return new NativeWorklets();
}

class NativeWorklets {}
