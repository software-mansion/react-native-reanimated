'use strict';

import { createCustomError, registerCustomError } from './errors';

export const WorkletsError = createCustomError('Worklets');

// To capture it in a the registering worklet's closure.
const WorkletsErrorConstructor = WorkletsError;

export function registerWorkletsError() {
  'worklet';
  registerCustomError(WorkletsErrorConstructor, 'Worklets');
}
