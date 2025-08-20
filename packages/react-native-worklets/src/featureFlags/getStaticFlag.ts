'use strict';

import { WorkletsModule } from '../WorkletsModule';

export function getStaticFeatureFlag(name: string): boolean {
  return WorkletsModule.getStaticFeatureFlag(name);
}
