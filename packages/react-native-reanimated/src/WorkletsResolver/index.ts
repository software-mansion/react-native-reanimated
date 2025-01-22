'use strict';

import type { IWorkletsModule } from '../worklets/WorkletsModule';
// @ts-expect-error - required for resolving the module
import { WorkletsModule as ResolvedWorkletsModule } from './WorkletsResolver';

export const WorkletsModule = ResolvedWorkletsModule as IWorkletsModule;
export type {
  IWorkletsModule,
  WorkletsModuleProxy,
} from '../worklets/WorkletsModule';
