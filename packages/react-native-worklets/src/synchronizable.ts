'use strict';

import { WorkletsError } from './WorkletsError';

export function createSynchronizable(): never {
  throw new WorkletsError('`createSynchronizable` is not supported on web.');
}
