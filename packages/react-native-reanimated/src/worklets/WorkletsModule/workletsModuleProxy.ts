'use strict';

import type { ShareableRef } from '../../workletTypes';

/** Type of `__workletsModuleProxy` injected with JSI. */
export interface WorkletsModuleProxy {
  makeShareableClone<TValue>(
    value: TValue,
    shouldPersistRemote: boolean,
    nativeStateSource?: object
  ): ShareableRef<TValue>;
}

export interface IWorkletsModule extends WorkletsModuleProxy {}
