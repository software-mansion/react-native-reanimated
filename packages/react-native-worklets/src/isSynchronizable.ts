'use strict';

import { WorkletsError } from './WorkletsError';
import type { Synchronizable } from './workletTypes';

export function isSynchronizable<TValue>(
  _value: unknown
): _value is Synchronizable<TValue> {
  throw new WorkletsError('`isSynchronizable` is not supported on web.');
}
