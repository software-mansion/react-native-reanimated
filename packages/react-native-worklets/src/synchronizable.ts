'use strict';

import { logger } from './logger';
import { WorkletsModule } from './WorkletsModule';
import type { SynchronizableRef } from './workletTypes';

export function makeSynchronizable<TValue>(
  initialValue: TValue
): SynchronizableRef<TValue> {
  // TODO Support other types than number.
  if (typeof initialValue !== 'number') {
    logger.warn("Couldn't make a synchronizable from the given value.");
  }
  return WorkletsModule.makeSynchronizable(initialValue);
}
