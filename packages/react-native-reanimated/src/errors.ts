'use strict';

import { createCustomError, registerCustomError } from './WorkletsResolver';

export const ReanimatedError = createCustomError('Reanimated');

const ReanimatedErrorConstructor = ReanimatedError;

export function registerReanimatedError() {
  'worklet';
  registerCustomError(ReanimatedErrorConstructor, 'Reanimated');
}
