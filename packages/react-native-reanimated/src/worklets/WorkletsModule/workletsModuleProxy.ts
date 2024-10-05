'use strict';

import type { ShareableRef } from '../../commonTypes';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  makeShareableClone<T>(
    value: T,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<T>;
}
