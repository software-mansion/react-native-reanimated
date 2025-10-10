'use strict';

import { WorkletsError } from '../debug';
import type { Synchronizable } from './types';

export function createSynchronizable<TValue>(
  _value: TValue
): Synchronizable<TValue> {
  throw new WorkletsError('`createSynchronizable` is not supported on web.');
}
