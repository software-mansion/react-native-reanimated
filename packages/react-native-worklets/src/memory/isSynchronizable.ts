'use strict';

import { WorkletsError } from '../debug/WorkletsError';
import type { Synchronizable } from './types';

export function isSynchronizable<TValue>(
  _value: unknown
): _value is Synchronizable<TValue> {
  throw new WorkletsError('`isSynchronizable` is not supported on web.');
}
