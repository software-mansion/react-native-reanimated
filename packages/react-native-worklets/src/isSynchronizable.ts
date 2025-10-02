'use strict';

import { WorkletsError } from './WorkletsError';

export function isSynchronizable(): never {
  throw new WorkletsError('`isSynchronizable` is not supported on web.');
}
