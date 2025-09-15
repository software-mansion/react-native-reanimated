'use strict';

import { ReanimatedError } from '../../../../common';
import { VALID_TRANSITION_BEHAVIORS } from './constants';
export const ERROR_MESSAGES = {
  invalidTransitionBehavior: behavior => `Invalid transition behavior "${behavior}".`
};
export function normalizeTransitionBehavior(behavior = 'normal') {
  if (!VALID_TRANSITION_BEHAVIORS.includes(behavior)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidTransitionBehavior(behavior));
  }
  return behavior === 'allow-discrete';
}
//# sourceMappingURL=settings.js.map