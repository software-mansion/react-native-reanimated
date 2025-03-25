'use strict';

import { WorkletsModule } from './WorkletsModule';
import type { SynchronizableRef } from './workletTypes';

export function makeSynchronizable<TValue>(
  value: TValue
): SynchronizableRef<TValue> {
  return WorkletsModule.makeSynchronizable(value);
}
