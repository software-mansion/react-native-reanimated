'use strict';

import type { IWorkletsModule, ShareableRef } from '../../commonTypes';
import { ReanimatedError } from '../../errors';

export function createJSWorkletsModule(): IWorkletsModule {
  return new JSWorklets();
}

class JSWorklets implements IWorkletsModule {
  makeShareableClone<T>(): ShareableRef<T> {
    throw new ReanimatedError(
      'makeShareableClone should never be called in JSWorklets.'
    );
  }
}
