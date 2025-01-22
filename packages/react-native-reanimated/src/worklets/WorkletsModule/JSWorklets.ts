/* eslint-disable reanimated/use-reanimated-error */
'use strict';

import type { ShareableRef } from '../../workletTypes';
import type { IWorkletsModule } from './workletsModuleProxy';

export function createJSWorkletsModule(): IWorkletsModule {
  return new JSWorklets();
}

class JSWorklets implements IWorkletsModule {
  makeShareableClone<T>(): ShareableRef<T> {
    throw new Error(
      '[Worklets] makeShareableClone should never be called in JSWorklets.'
    );
  }
}
