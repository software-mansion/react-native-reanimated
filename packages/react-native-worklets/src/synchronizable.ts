'use strict';

import { WorkletsError } from './WorkletsError';
import type { Synchronizable } from './workletTypes';

export function createSynchronizable<TValue>(
  _value: TValue
): Synchronizable<TValue> {
  throw new WorkletsError('`createSynchronizable` is not supported on web.');
}
