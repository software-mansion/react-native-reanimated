'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import type { Synchronizable } from './types';

export function createSynchronizable<TValue = unknown>(
  _value: TValue
): Synchronizable<TValue> {
  throw new WorkletsError('`createSynchronizable` is not supported on web.');
}
