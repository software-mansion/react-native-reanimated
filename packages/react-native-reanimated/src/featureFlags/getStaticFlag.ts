'use strict';

import { ReanimatedModule } from '../ReanimatedModule';

export function getStaticFeatureFlag(name: string): boolean {
  return ReanimatedModule.getStaticFeatureFlag(name);
}
