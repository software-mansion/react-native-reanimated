'use strict';

import { createCustomError, registerCustomError } from './WorkletsResolver';

export const ReanimatedError = createCustomError('Reanimated');

export function registerReanimatedError() {
  'worklet';
  registerCustomError(ReanimatedError, 'Reanimated');
}
