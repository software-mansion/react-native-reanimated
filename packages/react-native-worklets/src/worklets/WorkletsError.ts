'use strict';

import { createCustomError, registerCustomError } from './errors';

export const WorkletsError = createCustomError('Worklets');

export function registerWorkletsError() {
  'worklet';
  registerCustomError(WorkletsError, 'Worklets');
}
