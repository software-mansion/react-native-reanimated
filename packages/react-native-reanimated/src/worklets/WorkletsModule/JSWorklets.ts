'use strict';

import type { IWorkletsModule } from '../../commonTypes';

export function createJSWorkletsModule(): IWorkletsModule {
  return new JSWorklets();
}

class JSWorklets implements IWorkletsModule {}
